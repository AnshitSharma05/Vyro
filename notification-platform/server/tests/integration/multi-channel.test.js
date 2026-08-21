const request = require('supertest');
const app = require('../../src/app');
const organizationRepository = require('../../src/modules/organizations/organization.repository');
const projectRepository = require('../../src/modules/projects/project.repository');
const apiKeyRepository = require('../../src/modules/api-keys/api-key.repository');
const templateRepository = require('../../src/modules/templates/template.repository');
const notificationRepository = require('../../src/modules/notifications/notification.repository');
const authRepository = require('../../src/modules/auth/auth.repository');
const providerFactory = require('../../src/providers/provider.factory');
const notificationQueue = require('../../src/queues/notification.queue');
const { generateApiKey, hashApiKey } = require('../../src/modules/api-keys/api-key.utils');

describe('MULTI-CHANNEL NOTIFICATIONS & PROVIDER ABSTRACTION INTEGRATION TESTS (PHASE 15)', () => {
  const userA = {
    id: 'mc_u1000-0000-0000-0000-000000000001',
    email: 'user_mc@example.com',
    name: 'User MC',
  };

  const orgA = {
    id: 'mc_o2000-0000-0000-0000-000000000001',
    name: 'Organization MC',
    slug: 'org-mc',
  };

  const projectA = {
    id: 'mc_p3000-0000-0000-0000-000000000001',
    organizationId: orgA.id,
    name: 'Project MC A',
    slug: 'proj-mc-a',
    organization: orgA,
  };

  const { rawKey: rawApiKey, keyPrefix } = generateApiKey();
  const apiKeyRecord = {
    id: 'key-mc-1',
    projectId: projectA.id,
    name: 'Key MC 1',
    keyPrefix,
    keyHash: hashApiKey(rawApiKey),
    revokedAt: null,
    expiresAt: null,
    createdAt: new Date(),
    project: projectA,
  };

  const templatesMap = {
    'email-template': {
      id: 'tpl-mc-email',
      projectId: projectA.id,
      name: 'email-template',
      channel: 'EMAIL',
      subject: 'Email Subject',
      body: 'Email Body {{name}}',
    },
    'sms-template': {
      id: 'tpl-mc-sms',
      projectId: projectA.id,
      name: 'sms-template',
      channel: 'SMS',
      subject: null,
      body: 'SMS OTP: {{otp}}',
    },
    'whatsapp-template': {
      id: 'tpl-mc-wa',
      projectId: projectA.id,
      name: 'whatsapp-template',
      channel: 'WHATSAPP',
      subject: null,
      body: 'WhatsApp alert: {{orderId}}',
    },
    'push-template': {
      id: 'tpl-mc-push',
      projectId: projectA.id,
      name: 'push-template',
      channel: 'PUSH',
      subject: 'Push Title',
      body: 'Push Body message',
    },
  };

  const inMemoryNotifications = [];

  beforeAll(() => {
    jest.spyOn(authRepository, 'findById').mockResolvedValue(userA);
    jest.spyOn(organizationRepository, 'findMembership').mockResolvedValue({ role: 'OWNER' });
    jest.spyOn(projectRepository, 'findProjectById').mockResolvedValue(projectA);
    jest.spyOn(apiKeyRepository, 'findByPrefix').mockResolvedValue([apiKeyRecord]);
    jest.spyOn(apiKeyRepository, 'updateLastUsedAt').mockResolvedValue({});
    jest.spyOn(templateRepository, 'findByNameAndProjectId').mockImplementation(async (name, projId) => {
      return templatesMap[name] || null;
    });

    jest.spyOn(notificationRepository, 'create').mockImplementation(async (data) => {
      const record = {
        id: `notif-mc-${inMemoryNotifications.length + 1}`,
        projectId: data.projectId,
        templateId: data.templateId,
        channel: data.channel,
        recipient: data.recipient,
        status: data.status,
        metadata: data.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryNotifications.push(record);
      return record;
    });

    jest.spyOn(notificationQueue, 'addNotificationJob').mockResolvedValue({ id: 'job-mc-1' });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('1. POST /api/v1/notifications/send accepts SMS channel and valid phone recipient', async () => {
    const res = await request(app)
      .post('/api/v1/notifications/send')
      .set('X-API-Key', rawApiKey)
      .send({
        channel: 'SMS',
        template: 'sms-template',
        recipient: '+919999988888',
        data: { otp: '654321' },
      });

    expect(res.statusCode).toBe(202);
    expect(res.body.data.channel).toBe('SMS');
    expect(res.body.data.recipient).toBe('+919999988888');
  });

  it('2. POST /api/v1/notifications/send accepts WHATSAPP channel', async () => {
    const res = await request(app)
      .post('/api/v1/notifications/send')
      .set('X-API-Key', rawApiKey)
      .send({
        channel: 'WHATSAPP',
        template: 'whatsapp-template',
        recipient: '+919876543210',
        data: { orderId: 'ORD-777' },
      });

    expect(res.statusCode).toBe(202);
    expect(res.body.data.channel).toBe('WHATSAPP');
  });

  it('3. POST /api/v1/notifications/send accepts PUSH channel with device token', async () => {
    const res = await request(app)
      .post('/api/v1/notifications/send')
      .set('X-API-Key', rawApiKey)
      .send({
        channel: 'PUSH',
        template: 'push-template',
        recipient: 'device_token_xyz_123',
      });

    expect(res.statusCode).toBe(202);
    expect(res.body.data.channel).toBe('PUSH');
  });

  it('4. Returns HTTP 400 (TEMPLATE_CHANNEL_MISMATCH) if template channel does not match requested channel', async () => {
    const res = await request(app)
      .post('/api/v1/notifications/send')
      .set('X-API-Key', rawApiKey)
      .send({
        channel: 'SMS',
        template: 'email-template', // Incompatible channel (EMAIL vs SMS)
        recipient: '+919999988888',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('TEMPLATE_CHANNEL_MISMATCH');
  });

  it('5. ProviderFactory resolves concrete providers for all 4 channels', () => {
    expect(providerFactory.getProvider('EMAIL').name).toBe('EMAIL_PROVIDER');
    expect(providerFactory.getProvider('SMS').name).toBe('mock-sms');
    expect(providerFactory.getProvider('WHATSAPP').name).toBe('mock-whatsapp');
    expect(providerFactory.getProvider('PUSH').name).toBe('fcm');
  });
});
