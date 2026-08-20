const request = require('supertest');
const app = require('../../src/app');
const organizationRepository = require('../../src/modules/organizations/organization.repository');
const projectRepository = require('../../src/modules/projects/project.repository');
const apiKeyRepository = require('../../src/modules/api-keys/api-key.repository');
const templateRepository = require('../../src/modules/templates/template.repository');
const notificationRepository = require('../../src/modules/notifications/notification.repository');
const authRepository = require('../../src/modules/auth/auth.repository');
const notificationQueue = require('../../src/queues/notification.queue');
const { processNotificationJob } = require('../../src/workers/notification.worker');
const { generateApiKey, hashApiKey } = require('../../src/modules/api-keys/api-key.utils');

describe('ASYNC NOTIFICATION DELIVERY INTEGRATION TESTS (PHASE 8)', () => {
  const userA = {
    id: '91000000-0000-0000-0000-000000000001',
    email: 'user_async@example.com',
    name: 'User Async',
  };

  const orgA = {
    id: '92000000-0000-0000-0000-000000000001',
    name: 'Organization Async',
    slug: 'org-async',
  };

  const projectA = {
    id: '93000000-0000-0000-0000-000000000001',
    organizationId: orgA.id,
    name: 'Project Async',
    slug: 'proj-async',
    organization: orgA,
  };

  const { rawKey: rawApiKeyA, keyPrefix: prefixA } = generateApiKey();
  const hashA = hashApiKey(rawApiKeyA);

  const apiKeyRecordA = {
    id: 'key-async-a',
    projectId: projectA.id,
    name: 'Key Async A',
    keyPrefix: prefixA,
    keyHash: hashA,
    revokedAt: null,
    expiresAt: null,
    createdAt: new Date(),
    project: projectA,
  };

  const templateA = {
    id: 'tpl-async-a',
    projectId: projectA.id,
    name: 'order-dispatch',
    channel: 'EMAIL',
    subject: 'Order {{orderId}} Dispatched',
    body: 'Hello {{name}}, your order {{orderId}} is dispatched.',
  };

  const inMemoryNotifications = [];
  const inMemoryAttempts = [];
  const inMemoryJobs = [];

  beforeAll(() => {
    jest.spyOn(authRepository, 'findById').mockResolvedValue(userA);
    jest.spyOn(organizationRepository, 'findMembership').mockResolvedValue({ role: 'OWNER' });
    jest.spyOn(projectRepository, 'findProjectById').mockResolvedValue(projectA);
    jest.spyOn(apiKeyRepository, 'findByPrefix').mockImplementation(async (prefix) => {
      if (prefix === prefixA) return [apiKeyRecordA];
      return [];
    });
    jest.spyOn(apiKeyRepository, 'updateLastUsedAt').mockResolvedValue({});
    jest.spyOn(templateRepository, 'findByNameAndProjectId').mockImplementation(async (name, projId) => {
      if (name === 'order-dispatch' && projId === projectA.id) return templateA;
      return null;
    });

    jest.spyOn(notificationRepository, 'create').mockImplementation(async (data) => {
      const record = {
        id: `notif-async-${inMemoryNotifications.length + 1}`,
        projectId: data.projectId,
        templateId: data.templateId,
        channel: data.channel,
        recipient: data.recipient,
        status: data.status,
        metadata: data.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        sentAt: null,
        failedAt: null,
      };
      inMemoryNotifications.push(record);
      return record;
    });

    jest.spyOn(notificationRepository, 'createAttempt').mockImplementation(async (data) => {
      const attempt = {
        id: `att-async-${inMemoryAttempts.length + 1}`,
        notificationId: data.notificationId,
        provider: data.provider,
        status: data.status,
        errorCode: data.errorCode || null,
        errorMessage: data.errorMessage || null,
        attemptedAt: new Date(),
        deliveredAt: data.deliveredAt || null,
      };
      inMemoryAttempts.push(attempt);
      return attempt;
    });

    jest.spyOn(notificationRepository, 'updateStatus').mockImplementation(async (id, updateData) => {
      const notif = inMemoryNotifications.find((n) => n.id === id);
      if (notif) {
        notif.status = updateData.status;
        if (updateData.sentAt) notif.sentAt = updateData.sentAt;
        if (updateData.failedAt) notif.failedAt = updateData.failedAt;
      }
      return notif;
    });

    jest.spyOn(notificationQueue, 'addNotificationJob').mockImplementation(async ({ notificationId }) => {
      const job = { id: `job-${inMemoryJobs.length + 1}`, data: { notificationId } };
      inMemoryJobs.push(job);
      return job;
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('POST /api/v1/notifications/send enqueues BullMQ job and returns HTTP 202 Accepted with status PENDING', async () => {
    const res = await request(app)
      .post('/api/v1/notifications/send')
      .set('X-API-Key', rawApiKeyA)
      .send({
        template: 'order-dispatch',
        recipient: 'async_client@example.com',
        data: { name: 'Anshit', orderId: 'ORD-777' },
      });

    expect(res.statusCode).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.id).toBeDefined();
    expect(notificationQueue.addNotificationJob).toHaveBeenCalledWith(
      expect.objectContaining({ notificationId: res.body.data.id })
    );
  });
});
