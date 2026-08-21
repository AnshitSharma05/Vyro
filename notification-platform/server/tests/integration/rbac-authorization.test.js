const request = require('supertest');
const app = require('../../src/app');
const organizationRepository = require('../../src/modules/organizations/organization.repository');
const projectRepository = require('../../src/modules/projects/project.repository');
const apiKeyRepository = require('../../src/modules/api-keys/api-key.repository');
const templateRepository = require('../../src/modules/templates/template.repository');
const notificationRepository = require('../../src/modules/notifications/notification.repository');
const authRepository = require('../../src/modules/auth/auth.repository');
const authorizationService = require('../../src/shared/auth/authorization.service');
const notificationQueue = require('../../src/queues/notification.queue');
const { generateApiKey, hashApiKey } = require('../../src/modules/api-keys/api-key.utils');

describe('RBAC, API-KEY SCOPES & ADVANCED AUTHORIZATION INTEGRATION TESTS (PHASE 17)', () => {
  const userOwner = {
    id: 'usr_owner_1111-0000-0000-0000-000000000001',
    email: 'owner@example.com',
    name: 'Org Owner',
  };

  const userAdmin = {
    id: 'usr_admin_2222-0000-0000-0000-000000000002',
    email: 'admin@example.com',
    name: 'Org Admin',
  };

  const orgA = {
    id: 'org_rbac_1000-0000-0000-0000-000000000001',
    name: 'Organization RBAC',
    slug: 'org-rbac',
  };

  const projectA = {
    id: 'proj_rbac_2000-0000-0000-0000-000000000001',
    organizationId: orgA.id,
    name: 'Project RBAC A',
    slug: 'proj-rbac-a',
    organization: orgA,
  };

  // API Key with ONLY 'notifications:read' scope
  const { rawKey: rawReadOnlyKey, keyPrefix: prefixRead } = generateApiKey();
  const readOnlyApiKeyRecord = {
    id: 'key-read-only',
    projectId: projectA.id,
    name: 'Read Only Key',
    keyPrefix: prefixRead,
    keyHash: hashApiKey(rawReadOnlyKey),
    scopes: ['notifications:read'],
    revokedAt: null,
    expiresAt: null,
    createdAt: new Date(),
    project: projectA,
  };

  // API Key with 'notifications:send' scope
  const { rawKey: rawSendKey, keyPrefix: prefixSend } = generateApiKey();
  const sendApiKeyRecord = {
    id: 'key-send-only',
    projectId: projectA.id,
    name: 'Send Key',
    keyPrefix: prefixSend,
    keyHash: hashApiKey(rawSendKey),
    scopes: ['notifications:send'],
    revokedAt: null,
    expiresAt: null,
    createdAt: new Date(),
    project: projectA,
  };

  const templateInvoice = {
    id: 'tpl-rbac-inv',
    projectId: projectA.id,
    name: 'invoice-reminder',
    channel: 'EMAIL',
    subject: 'Invoice for {{name}}',
    body: 'Invoice amount {{amount}}',
  };

  beforeAll(() => {
    jest.spyOn(authRepository, 'findById').mockImplementation(async (id) => {
      if (id === userOwner.id) return userOwner;
      if (id === userAdmin.id) return userAdmin;
      return null;
    });

    jest.spyOn(organizationRepository, 'findMembership').mockImplementation(async (orgId, userId) => {
      if (orgId === orgA.id && userId === userOwner.id) return { role: 'OWNER', organizationId: orgA.id, userId };
      if (orgId === orgA.id && userId === userAdmin.id) return { role: 'ADMIN', organizationId: orgA.id, userId };
      return null;
    });

    jest.spyOn(projectRepository, 'findProjectById').mockResolvedValue(projectA);

    jest.spyOn(apiKeyRepository, 'findByPrefix').mockImplementation(async (prefix) => {
      if (prefix === prefixRead) return [readOnlyApiKeyRecord];
      if (prefix === prefixSend) return [sendApiKeyRecord];
      return [];
    });
    jest.spyOn(apiKeyRepository, 'updateLastUsedAt').mockResolvedValue({});
    jest.spyOn(templateRepository, 'findByNameAndProjectId').mockResolvedValue(templateInvoice);

    jest.spyOn(notificationRepository, 'create').mockImplementation(async (data) => ({
      id: 'notif-rbac-1',
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    jest.spyOn(notificationQueue, 'addNotificationJob').mockResolvedValue({ id: 'job-rbac-1' });
    jest.spyOn(organizationRepository, 'countOwners').mockResolvedValue(1);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('1. Rejects POST /api/v1/notifications/send with 403 Forbidden if API key lacks "notifications:send" scope', async () => {
    const res = await request(app)
      .post('/api/v1/notifications/send')
      .set('X-API-Key', rawReadOnlyKey) // Key has ONLY notifications:read scope
      .send({
        template: 'invoice-reminder',
        recipient: 'user@example.com',
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.error.message).toContain('notifications:send');
  });

  it('2. Accepts POST /api/v1/notifications/send with 202 Accepted when API key possesses "notifications:send" scope', async () => {
    const res = await request(app)
      .post('/api/v1/notifications/send')
      .set('X-API-Key', rawSendKey) // Key has notifications:send scope
      .send({
        template: 'invoice-reminder',
        recipient: 'user@example.com',
      });

    expect(res.statusCode).toBe(202);
    expect(res.body.data.id).toBeDefined();
  });

  it('3. Throws 409 Conflict (LAST_OWNER_PROTECTION) when attempting to demote sole Owner of an organization', async () => {
    const ownerMember = { id: 'mem-owner-1', organizationId: orgA.id, role: 'OWNER' };
    jest.spyOn(organizationRepository, 'findMemberById').mockResolvedValue(ownerMember);

    await expect(
      authorizationService.validateRoleUpdate({
        organizationId: orgA.id,
        actorUserId: userOwner.id,
        actorRole: 'OWNER',
        targetMemberId: ownerMember.id,
        newRole: 'ADMIN',
      })
    ).rejects.toThrow('Cannot demote the sole Owner of an organization');
  });
});
