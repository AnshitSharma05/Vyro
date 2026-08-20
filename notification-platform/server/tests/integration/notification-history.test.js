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

describe('NOTIFICATION HISTORY & OBSERVABILITY INTEGRATION TESTS', () => {
  const userA = {
    id: '71000000-0000-0000-0000-000000000001',
    email: 'usera_history@example.com',
    name: 'User A History',
  };

  const tokenUserA = signToken({ sub: userA.id, email: userA.email });

  const orgA = {
    id: '81000000-0000-0000-0000-000000000001',
    name: 'Organization History A',
    slug: 'org-hist-a',
  };

  const projectA = {
    id: '91000000-0000-0000-0000-000000000001',
    organizationId: orgA.id,
    name: 'Project History A',
    slug: 'proj-hist-a',
    organization: orgA,
  };

  const { rawKey: rawApiKeyA, keyPrefix: prefixA } = generateApiKey();
  const hashA = hashApiKey(rawApiKeyA);

  const apiKeyRecordA = {
    id: 'key-hist-a',
    projectId: projectA.id,
    name: 'Key Hist A',
    keyPrefix: prefixA,
    keyHash: hashA,
    revokedAt: null,
    expiresAt: null,
    createdAt: new Date(),
    project: projectA,
  };

  let templateRecordA = {
    id: 'tpl-hist-a',
    projectId: projectA.id,
    name: 'order-update',
    channel: 'EMAIL',
    subject: 'Order {{orderId}} Update',
    body: 'Original Body: Hello {{name}}, order {{orderId}} updated.',
  };

  const inMemoryNotifications = [];
  const inMemoryAttempts = [];

  beforeAll(() => {
    jest.spyOn(authRepository, 'findById').mockImplementation(async (id) => {
      if (id === userA.id) return userA;
      return null;
    });

    jest.spyOn(organizationRepository, 'findMembership').mockImplementation(async (orgId, userId) => {
      if (orgId === orgA.id && userId === userA.id) return { role: 'OWNER' };
      return null;
    });

    jest.spyOn(projectRepository, 'findProjectById').mockImplementation(async (projId) => {
      if (projId === projectA.id) return projectA;
      return null;
    });

    jest.spyOn(apiKeyRepository, 'findByPrefix').mockImplementation(async (prefix) => {
      if (prefix === prefixA) return [apiKeyRecordA];
      return [];
    });

    jest.spyOn(apiKeyRepository, 'updateLastUsedAt').mockResolvedValue({});

    jest.spyOn(templateRepository, 'findByNameAndProjectId').mockImplementation(async (name, projId) => {
      if (name === 'order-update' && projId === projectA.id) return templateRecordA;
      return null;
    });

    jest.spyOn(notificationRepository, 'create').mockImplementation(async (data) => {
      const record = {
        id: `notif-hist-${inMemoryNotifications.length + 1}`,
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
        template: { id: templateRecordA.id, name: templateRecordA.name },
        attempts: [],
      };
      inMemoryNotifications.push(record);
      return record;
    });

    jest.spyOn(notificationRepository, 'createAttempt').mockImplementation(async (data) => {
      const attempt = {
        id: `att-hist-${inMemoryAttempts.length + 1}`,
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

    jest.spyOn(notificationRepository, 'findManyByProjectId').mockImplementation(async ({ projectId, page = 1, limit = 20, status, channel, recipient }) => {
      let filtered = inMemoryNotifications.filter((n) => n.projectId === projectId);
      if (status) filtered = filtered.filter((n) => n.status === status);
      if (channel) filtered = filtered.filter((n) => n.channel === channel);
      if (recipient) filtered = filtered.filter((n) => n.recipient.includes(recipient));

      const safePage = Math.max(1, page);
      const safeLimit = Math.min(100, Math.max(1, limit));
      const totalCount = filtered.length;

      return {
        items: filtered,
        notifications: filtered,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / safeLimit) || 1,
        },
        totalCount,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(totalCount / safeLimit) || 1,
      };
    });

    jest.spyOn(notificationRepository, 'findByIdAndProjectId').mockImplementation(async (id, projId) => {
      return inMemoryNotifications.find((n) => n.id === id && n.projectId === projId) || null;
    });

    const mockEmailProvider = {
      name: 'EMAIL_NODEMAILER',
      send: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-hist-123', provider: 'EMAIL_NODEMAILER' }),
    };
    jest.spyOn(providerFactory, 'getProvider').mockReturnValue(mockEmailProvider);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  let createdNotifId;

  describe('Historical Rendered Content Snapshot Preservation', () => {
    it('1. Triggers notification send with template v1 and saves content snapshot', async () => {
      const res = await request(app)
        .post('/api/v1/notifications/send')
        .set('X-API-Key', rawApiKeyA)
        .send({
          template: 'order-update',
          recipient: 'history_user@example.com',
          data: { name: 'Anshit', orderId: 'ORD-999' },
        });

      expect(res.statusCode).toBe(200);
      createdNotifId = res.body.data.id;
    });

    it('2. Updating template text v1 -> v2 does NOT alter previously stored notification snapshot', async () => {
      // Simulate developer changing template v1 to v2
      templateRecordA = {
        ...templateRecordA,
        body: 'Updated v2 Template Body for {{name}}',
      };

      // Retrieve single notification details via API Key
      const res = await request(app)
        .get(`/api/v1/notifications/${createdNotifId}`)
        .set('X-API-Key', rawApiKeyA);

      expect(res.statusCode).toBe(200);
      const metadata = res.body.data.notification.metadata;
      expect(metadata.body).toBe('Original Body: Hello Anshit, order ORD-999 updated.');
    });
  });

  describe('Paginated Notification Listing with Filters & Pagination Metadata', () => {
    it('Returns standardized pagination metadata and filters by status', async () => {
      const res = await request(app)
        .get('/api/v1/notifications?status=SENT&page=1&limit=10')
        .set('X-API-Key', rawApiKeyA);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(10);
      expect(res.body.data.notifications[0].id).toBe(createdNotifId);
    });
  });

  describe('Multiple Delivery Attempts Timeline', () => {
    it('Notification details include attempts array ordered chronologically', async () => {
      const res = await request(app)
        .get(`/api/v1/notifications/${createdNotifId}`)
        .set('X-API-Key', rawApiKeyA);

      expect(res.statusCode).toBe(200);
      const attempts = res.body.data.notification.attempts;
      expect(Array.isArray(attempts)).toBe(true);
      expect(attempts.length).toBeGreaterThanOrEqual(1);
      expect(attempts[0].provider).toBe('EMAIL_NODEMAILER');
      expect(attempts[0].status).toBe('SUCCESS');
    });
  });
});
