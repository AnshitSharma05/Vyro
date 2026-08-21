const request = require('supertest');
const app = require('../../src/app');
const organizationRepository = require('../../src/modules/organizations/organization.repository');
const projectRepository = require('../../src/modules/projects/project.repository');
const apiKeyRepository = require('../../src/modules/api-keys/api-key.repository');
const templateRepository = require('../../src/modules/templates/template.repository');
const notificationRepository = require('../../src/modules/notifications/notification.repository');
const authRepository = require('../../src/modules/auth/auth.repository');
const notificationQueue = require('../../src/queues/notification.queue');
const { generateApiKey, hashApiKey } = require('../../src/modules/api-keys/api-key.utils');

describe('IDEMPOTENCY & DUPLICATE PREVENTION INTEGRATION TESTS (PHASE 11)', () => {
  const userA = {
    id: 'idm10000-0000-0000-0000-000000000001',
    email: 'user_idm@example.com',
    name: 'User IDM Integ',
  };

  const orgA = {
    id: 'idm20000-0000-0000-0000-000000000001',
    name: 'Organization IDM',
    slug: 'org-idm',
  };

  const projectA = {
    id: 'idm30000-0000-0000-0000-000000000001',
    organizationId: orgA.id,
    name: 'Project IDM A',
    slug: 'proj-idm-a',
    organization: orgA,
  };

  const projectB = {
    id: 'idm30000-0000-0000-0000-000000000002',
    organizationId: orgA.id,
    name: 'Project IDM B',
    slug: 'proj-idm-b',
    organization: orgA,
  };

  const { rawKey: rawApiKeyA1, keyPrefix: prefixA1 } = generateApiKey();
  const apiKeyRecordA1 = {
    id: 'key-idm-a1',
    projectId: projectA.id,
    name: 'Key IDM A1',
    keyPrefix: prefixA1,
    keyHash: hashApiKey(rawApiKeyA1),
    revokedAt: null,
    expiresAt: null,
    createdAt: new Date(),
    project: projectA,
  };

  const { rawKey: rawApiKeyA2, keyPrefix: prefixA2 } = generateApiKey();
  const apiKeyRecordA2 = {
    id: 'key-idm-a2',
    projectId: projectA.id,
    name: 'Key IDM A2',
    keyPrefix: prefixA2,
    keyHash: hashApiKey(rawApiKeyA2),
    revokedAt: null,
    expiresAt: null,
    createdAt: new Date(),
    project: projectA,
  };

  const { rawKey: rawApiKeyB1, keyPrefix: prefixB1 } = generateApiKey();
  const apiKeyRecordB1 = {
    id: 'key-idm-b1',
    projectId: projectB.id,
    name: 'Key IDM B1',
    keyPrefix: prefixB1,
    keyHash: hashApiKey(rawApiKeyB1),
    revokedAt: null,
    expiresAt: null,
    createdAt: new Date(),
    project: projectB,
  };

  const templateInvoiceA = {
    id: 'tpl-idm-inv-a',
    projectId: projectA.id,
    name: 'invoice-receipt',
    channel: 'EMAIL',
    subject: 'Invoice {{num}}',
    body: 'Hello {{name}}',
  };

  const templateResetA = {
    id: 'tpl-idm-rst-a',
    projectId: projectA.id,
    name: 'password-reset',
    channel: 'EMAIL',
    subject: 'Reset Password',
    body: 'Reset code: {{code}}',
  };

  const templateInvoiceB = {
    id: 'tpl-idm-inv-b',
    projectId: projectB.id,
    name: 'invoice-receipt',
    channel: 'EMAIL',
    subject: 'Invoice {{num}}',
    body: 'Hello {{name}}',
  };

  const inMemoryNotifications = [];
  let queueAddCount = 0;

  beforeAll(() => {
    jest.spyOn(authRepository, 'findById').mockResolvedValue(userA);
    jest.spyOn(organizationRepository, 'findMembership').mockResolvedValue({ role: 'OWNER' });
    jest.spyOn(projectRepository, 'findProjectById').mockImplementation(async (id) => {
      if (id === projectA.id) return projectA;
      if (id === projectB.id) return projectB;
      return null;
    });

    jest.spyOn(apiKeyRepository, 'findByPrefix').mockImplementation(async (prefix) => {
      if (prefix === prefixA1) return [apiKeyRecordA1];
      if (prefix === prefixA2) return [apiKeyRecordA2];
      if (prefix === prefixB1) return [apiKeyRecordB1];
      return [];
    });
    jest.spyOn(apiKeyRepository, 'updateLastUsedAt').mockResolvedValue({});

    jest.spyOn(templateRepository, 'findByNameAndProjectId').mockImplementation(async (name, projId) => {
      if (name === 'invoice-receipt' && projId === projectA.id) return templateInvoiceA;
      if (name === 'password-reset' && projId === projectA.id) return templateResetA;
      if (name === 'invoice-receipt' && projId === projectB.id) return templateInvoiceB;
      return null;
    });

    jest.spyOn(notificationRepository, 'create').mockImplementation(async (data) => {
      const record = {
        id: `notif-idm-${inMemoryNotifications.length + 1}`,
        projectId: data.projectId,
        templateId: data.templateId,
        channel: data.channel,
        recipient: data.recipient,
        status: data.status,
        idempotencyKey: data.idempotencyKey || null,
        requestHash: data.requestHash || null,
        metadata: data.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryNotifications.push(record);
      return record;
    });

    jest.spyOn(notificationRepository, 'findByIdempotencyKey').mockImplementation(async (projId, key) => {
      return inMemoryNotifications.find((n) => n.projectId === projId && n.idempotencyKey === key) || null;
    });

    jest.spyOn(notificationQueue, 'addNotificationJob').mockImplementation(async () => {
      queueAddCount++;
      return { id: `job-idm-${queueAddCount}` };
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('1. Basic Idempotency: Repeated request with same Idempotency-Key returns original notification without duplicate DB record or queue job', async () => {
    const initialQueueCount = queueAddCount;

    // First Request
    const res1 = await request(app)
      .post('/api/v1/notifications/send')
      .set('X-API-Key', rawApiKeyA1)
      .set('Idempotency-Key', 'invoice-999-key')
      .send({
        template: 'invoice-receipt',
        recipient: 'idm_user@example.com',
        data: { name: 'Anshit', num: 'INV-999' },
      });

    expect(res1.statusCode).toBe(202);
    const createdId = res1.body.data.id;
    expect(queueAddCount).toBe(initialQueueCount + 1);

    // Second Request (Replay with same key and body)
    const res2 = await request(app)
      .post('/api/v1/notifications/send')
      .set('X-API-Key', rawApiKeyA1)
      .set('Idempotency-Key', 'invoice-999-key')
      .send({
        template: 'invoice-receipt',
        recipient: 'idm_user@example.com',
        data: { name: 'Anshit', num: 'INV-999' },
      });

    expect(res2.statusCode).toBe(202);
    expect(res2.body.data.id).toBe(createdId); // Resolves to original ID
    expect(queueAddCount).toBe(initialQueueCount + 1); // No new queue job created!
  });

  it('2. Key Reuse Conflict: Reusing same Idempotency-Key with different payload returns HTTP 409 Conflict', async () => {
    // Request with reused key but different template
    const resConflict = await request(app)
      .post('/api/v1/notifications/send')
      .set('X-API-Key', rawApiKeyA1)
      .set('Idempotency-Key', 'invoice-999-key')
      .send({
        template: 'password-reset', // Different template!
        recipient: 'idm_user@example.com',
        data: { code: '123456' },
      });

    expect(resConflict.statusCode).toBe(409);
    expect(resConflict.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('3. Multi-Project Isolation: Project B can use the same Idempotency-Key without colliding with Project A', async () => {
    const resProjB = await request(app)
      .post('/api/v1/notifications/send')
      .set('X-API-Key', rawApiKeyB1)
      .set('Idempotency-Key', 'invoice-999-key') // Same key name!
      .send({
        template: 'invoice-receipt',
        recipient: 'idm_b@example.com',
        data: { name: 'User B', num: 'INV-999' },
      });

    expect(resProjB.statusCode).toBe(202);
    expect(resProjB.body.data.id).toBeDefined();
    // Must be a different notification record
    const notifA = inMemoryNotifications.find((n) => n.projectId === projectA.id && n.idempotencyKey === 'invoice-999-key');
    const notifB = inMemoryNotifications.find((n) => n.projectId === projectB.id && n.idempotencyKey === 'invoice-999-key');
    expect(notifA.id).not.toBe(notifB.id);
  });

  it('4. API Key Rotation Preservation: Key A2 inherits project idempotency state from Key A1', async () => {
    const notifA = inMemoryNotifications.find((n) => n.projectId === projectA.id && n.idempotencyKey === 'invoice-999-key');

    const resA2 = await request(app)
      .post('/api/v1/notifications/send')
      .set('X-API-Key', rawApiKeyA2) // Rotated key for Project A
      .set('Idempotency-Key', 'invoice-999-key')
      .send({
        template: 'invoice-receipt',
        recipient: 'idm_user@example.com',
        data: { name: 'Anshit', num: 'INV-999' },
      });

    expect(resA2.statusCode).toBe(202);
    expect(resA2.body.data.id).toBe(notifA.id);
  });
});
