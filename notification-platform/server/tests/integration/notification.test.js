const request = require('supertest');
const app = require('../../src/app');
const organizationRepository = require('../../src/modules/organizations/organization.repository');
const projectRepository = require('../../src/modules/projects/project.repository');
const apiKeyRepository = require('../../src/modules/api-keys/api-key.repository');
const templateRepository = require('../../src/modules/templates/template.repository');
const notificationRepository = require('../../src/modules/notifications/notification.repository');
const authRepository = require('../../src/modules/auth/auth.repository');
const providerFactory = require('../../src/providers/provider.factory');
const { signToken } = require('../../src/shared/utils/jwt');
const { generateApiKey, hashApiKey } = require('../../src/modules/api-keys/api-key.utils');

describe('NOTIFICATION ENGINE E2E & CROSS-TENANT INTEGRATION TESTS', () => {
  const userA = {
    id: '31000000-0000-0000-0000-000000000001',
    email: 'usera_notif@example.com',
    name: 'User A',
  };

  const userB = {
    id: '31000000-0000-0000-0000-000000000002',
    email: 'userb_notif@example.com',
    name: 'User B',
  };

  const tokenUserA = signToken({ sub: userA.id, email: userA.email });
  const tokenUserB = signToken({ sub: userB.id, email: userB.email });

  const orgA = {
    id: '41000000-0000-0000-0000-000000000001',
    name: 'Organization A',
    slug: 'org-a',
  };

  const orgB = {
    id: '41000000-0000-0000-0000-000000000002',
    name: 'Organization B',
    slug: 'org-b',
  };

  const projectA = {
    id: '51000000-0000-0000-0000-000000000001',
    organizationId: orgA.id,
    name: 'Project A',
    slug: 'proj-a',
    organization: orgA,
  };

  const projectB = {
    id: '51000000-0000-0000-0000-000000000002',
    organizationId: orgB.id,
    name: 'Project B',
    slug: 'proj-b',
    organization: orgB,
  };

  // Generate API keys for testing
  const { rawKey: rawApiKeyA, keyPrefix: prefixA } = generateApiKey();
  const hashA = hashApiKey(rawApiKeyA);

  const { rawKey: rawApiKeyB, keyPrefix: prefixB } = generateApiKey();
  const hashB = hashApiKey(rawApiKeyB);

  const apiKeyRecordA = {
    id: 'key-record-a',
    projectId: projectA.id,
    name: 'Key A',
    keyPrefix: prefixA,
    keyHash: hashA,
    revokedAt: null,
    expiresAt: null,
    createdAt: new Date(),
    project: projectA,
  };

  const apiKeyRecordB = {
    id: 'key-record-b',
    projectId: projectB.id,
    name: 'Key B',
    keyPrefix: prefixB,
    keyHash: hashB,
    revokedAt: null,
    expiresAt: null,
    createdAt: new Date(),
    project: projectB,
  };

  const templateA = {
    id: 'tpl-a',
    projectId: projectA.id,
    name: 'order-confirmed',
    channel: 'EMAIL',
    subject: 'Order {{orderId}} Confirmed',
    body: 'Hello {{name}}, your order {{orderId}} has been confirmed.',
  };

  const templateB = {
    id: 'tpl-b',
    projectId: projectB.id,
    name: 'order-confirmed',
    channel: 'EMAIL',
    subject: 'Project B Order {{orderId}}',
    body: 'Project B Hello {{name}}',
  };

  const inMemoryNotifications = [];
  const inMemoryAttempts = [];

  beforeAll(() => {
    jest.spyOn(authRepository, 'findById').mockImplementation(async (id) => {
      if (id === userA.id) return userA;
      if (id === userB.id) return userB;
      return null;
    });

    jest.spyOn(organizationRepository, 'findMembership').mockImplementation(async (orgId, userId) => {
      if (orgId === orgA.id && userId === userA.id) return { role: 'OWNER' };
      if (orgId === orgB.id && userId === userB.id) return { role: 'OWNER' };
      return null;
    });

    jest.spyOn(projectRepository, 'findProjectById').mockImplementation(async (projId) => {
      if (projId === projectA.id) return projectA;
      if (projId === projectB.id) return projectB;
      return null;
    });

    jest.spyOn(apiKeyRepository, 'findByPrefix').mockImplementation(async (prefix) => {
      if (prefix === prefixA) return [apiKeyRecordA];
      if (prefix === prefixB) return [apiKeyRecordB];
      return [];
    });

    jest.spyOn(apiKeyRepository, 'updateLastUsedAt').mockResolvedValue({});

    jest.spyOn(templateRepository, 'findByNameAndProjectId').mockImplementation(async (name, projId) => {
      if (name === 'order-confirmed' && projId === projectA.id) return templateA;
      if (name === 'order-confirmed' && projId === projectB.id) return templateB;
      return null;
    });

    jest.spyOn(notificationRepository, 'create').mockImplementation(async (data) => {
      const record = {
        id: `notif-${inMemoryNotifications.length + 1}`,
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
        attempts: [],
      };
      inMemoryNotifications.push(record);
      return record;
    });

    jest.spyOn(notificationRepository, 'createAttempt').mockImplementation(async (data) => {
      const attempt = {
        id: `att-${inMemoryAttempts.length + 1}`,
        notificationId: data.notificationId,
        provider: data.provider,
        status: data.status,
        errorCode: data.errorCode || null,
        errorMessage: data.errorMessage || null,
        attemptedAt: new Date(),
        deliveredAt: data.deliveredAt || null,
      };
      inMemoryAttempts.push(attempt);
      const notif = inMemoryNotifications.find((n) => n.id === data.notificationId);
      if (notif) notif.attempts.push(attempt);
      return attempt;
    });

    jest.spyOn(notificationRepository, 'updateStatus').mockImplementation(async (id, updateData) => {
      const notif = inMemoryNotifications.find((n) => n.id === id);
      if (notif) {
        notif.status = updateData.status;
        if (updateData.sentAt) notif.sentAt = updateData.sentAt;
        if (updateData.failedAt) notif.failedAt = updateData.failedAt;
        if (updateData.metadata) notif.metadata = updateData.metadata;
      }
      return notif;
    });

    jest.spyOn(notificationRepository, 'findManyByProjectId').mockImplementation(async ({ projectId, page = 1, limit = 20 }) => {
      const filtered = inMemoryNotifications.filter((n) => n.projectId === projectId);
      return {
        notifications: filtered,
        totalCount: filtered.length,
        page,
        limit,
        totalPages: 1,
      };
    });

    jest.spyOn(notificationRepository, 'findByIdAndProjectId').mockImplementation(async (id, projId) => {
      return inMemoryNotifications.find((n) => n.id === id && n.projectId === projId) || null;
    });

    // Mock EmailProvider for integration tests
    const mockEmailProvider = {
      name: 'EMAIL_NODEMAILER',
      send: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-e2e-123', provider: 'EMAIL_NODEMAILER' }),
    };
    jest.spyOn(providerFactory, 'getProvider').mockImplementation((channel) => {
      if (channel === 'EMAIL') return mockEmailProvider;
      throw new Error(`No delivery provider configured for channel "${channel}"`);
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  let sentNotificationId;

  describe('1. Machine-to-Machine Send Notification (X-API-Key)', () => {
    it('Client sends notification using API Key A & Template A (200 OK, Status SENT)', async () => {
      const res = await request(app)
        .post('/api/v1/notifications/send')
        .set('X-API-Key', rawApiKeyA)
        .send({
          template: 'order-confirmed',
          recipient: 'anshit_client@example.com',
          data: {
            name: 'Anshit',
            orderId: 'ORD-98765',
          },
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SENT');
      expect(res.body.data.channel).toBe('EMAIL');
      expect(res.body.data.recipient).toBe('anshit_client@example.com');
      expect(res.body.data.id).toBeDefined();

      sentNotificationId = res.body.data.id;
    });

    it('Fails with 400 Bad Request when recipient email format is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/notifications/send')
        .set('X-API-Key', rawApiKeyA)
        .send({
          template: 'order-confirmed',
          recipient: 'not-an-email',
          data: { name: 'Anshit', orderId: 'ORD-1' },
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Fails with 400 Bad Request when required template variables are missing', async () => {
      const res = await request(app)
        .post('/api/v1/notifications/send')
        .set('X-API-Key', rawApiKeyA)
        .send({
          template: 'order-confirmed',
          recipient: 'anshit@example.com',
          data: { name: 'Anshit' }, // missing orderId
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Missing required template variables');
    });

    it('Fails with 401 Unauthorized when X-API-Key is missing or invalid', async () => {
      const res = await request(app)
        .post('/api/v1/notifications/send')
        .send({
          template: 'order-confirmed',
          recipient: 'anshit@example.com',
          data: { name: 'Anshit', orderId: 'ORD-1' },
        });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('2. Machine-to-Machine Notification Listing & Details', () => {
    it('API Key A lists notifications for Project A (200 OK)', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('X-API-Key', rawApiKeyA);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.notifications).toHaveLength(1);
      expect(res.body.data.notifications[0].id).toBe(sentNotificationId);
    });

    it('API Key A gets notification details by ID (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/v1/notifications/${sentNotificationId}`)
        .set('X-API-Key', rawApiKeyA);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.notification.id).toBe(sentNotificationId);
      expect(res.body.data.notification.attempts).toHaveLength(1);
    });
  });

  describe('3. Cross-Tenant Security & Project Isolation', () => {
    it('API Key A CANNOT retrieve Notification sent by Project B (404 Not Found)', async () => {
      // Create notification in Project B via API Key B
      const resB = await request(app)
        .post('/api/v1/notifications/send')
        .set('X-API-Key', rawApiKeyB)
        .send({
          template: 'order-confirmed',
          recipient: 'userb@example.com',
          data: { name: 'UserB', orderId: 'ORD-B1' },
        });
      const notifIdB = resB.body.data.id;

      // API Key A attempting to get Project B's notification
      const resA = await request(app)
        .get(`/api/v1/notifications/${notifIdB}`)
        .set('X-API-Key', rawApiKeyA);

      expect(resA.statusCode).toBe(404);
    });

    it('API Key A CANNOT see Project B notifications when listing (returns empty for A)', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('X-API-Key', rawApiKeyA);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.notifications.every((n) => n.projectId === projectA.id)).toBe(true);
    });
  });

  describe('4. Dashboard Access to Notifications (JWT Authenticated)', () => {
    it('User A (OWNER of Org A) CAN list Project A notifications via Dashboard API (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectA.id}/notifications`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.notifications).toBeDefined();
    });

    it('User B (Org B) CANNOT list Project A notifications via Dashboard API (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectA.id}/notifications`)
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(res.statusCode).toBe(403);
    });
  });
});
