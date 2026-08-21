const request = require('supertest');
const app = require('../../src/app');
const recipientService = require('../../src/modules/recipients/recipient.service');
const preferenceService = require('../../src/modules/preferences/preference.service');
const deviceService = require('../../src/modules/devices/device.service');
const notificationRepository = require('../../src/modules/notifications/notification.repository');
const templateRepository = require('../../src/modules/templates/template.repository');
const projectRepository = require('../../src/modules/projects/project.repository');
const apiKeyRepository = require('../../src/modules/api-keys/api-key.repository');
const webhookService = require('../../src/modules/webhooks/webhook.service');
const { generateApiKey, hashApiKey } = require('../../src/modules/api-keys/api-key.utils');

describe('NOTIFICATION PREFERENCES, USER DEVICES & DELIVERY RULES INTEGRATION TESTS (PHASE 18)', () => {
  const projectA = {
    id: 'proj_pref_1000-0000-0000-0000-000000000001',
    organizationId: 'org_pref_1',
    name: 'Project Preferences A',
    slug: 'proj-pref-a',
  };

  const { rawKey, keyPrefix } = generateApiKey();
  const apiKeyRecord = {
    id: 'key-pref-all',
    projectId: projectA.id,
    name: 'All Scopes Key',
    keyPrefix,
    keyHash: hashApiKey(rawKey),
    scopes: [
      'notifications:send',
      'notifications:read',
      'recipients:read',
      'recipients:write',
      'preferences:read',
      'preferences:write',
      'devices:read',
      'devices:write',
    ],
    revokedAt: null,
    expiresAt: null,
    createdAt: new Date(),
    project: projectA,
  };

  const templatePromo = {
    id: 'tpl-promo-1',
    projectId: projectA.id,
    name: 'promo-sale',
    channel: 'EMAIL',
    subject: 'Special Sale for {{name}}',
    body: 'Get 50% off now!',
  };

  const mockRecipient = {
    id: 'rec_user_123',
    projectId: projectA.id,
    externalUserId: 'user_12345',
    email: 'enduser@example.com',
    phone: '+15550199',
    preferences: [],
  };

  beforeAll(() => {
    jest.spyOn(projectRepository, 'findProjectById').mockResolvedValue(projectA);
    jest.spyOn(apiKeyRepository, 'findByPrefix').mockImplementation(async (prefix) => {
      if (prefix === keyPrefix) return [apiKeyRecord];
      return [];
    });
    jest.spyOn(apiKeyRepository, 'updateLastUsedAt').mockResolvedValue({});
    jest.spyOn(templateRepository, 'findByNameAndProjectId').mockResolvedValue(templatePromo);
    jest.spyOn(webhookService, 'dispatchCustomerWebhooksForEvent').mockResolvedValue([]);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('1. Suppresses MARKETING email notification when recipient preference defaults to false', async () => {
    jest.spyOn(recipientService, 'getOrCreateRecipient').mockResolvedValue(mockRecipient);
    jest.spyOn(deviceService, 'listDevices').mockResolvedValue([]);
    jest.spyOn(notificationRepository, 'create').mockImplementation(async (data) => ({
      id: 'notif-suppressed-1',
      ...data,
      createdAt: new Date(),
    }));

    const res = await request(app)
      .post('/api/v1/notifications/send')
      .set('X-API-Key', rawKey)
      .send({
        template: 'promo-sale',
        category: 'MARKETING',
        recipient: {
          externalUserId: 'user_12345',
          email: 'enduser@example.com',
        },
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('SUPPRESSED');
    expect(res.body.data.suppressionReason).toBe('USER_PREFERENCE');
  });

  it('2. Suppresses PUSH notification when recipient has no registered active devices', async () => {
    jest.spyOn(recipientService, 'getOrCreateRecipient').mockResolvedValue(mockRecipient);
    jest.spyOn(deviceService, 'listDevices').mockResolvedValue([]); // Zero active devices
    jest.spyOn(templateRepository, 'findByNameAndProjectId').mockResolvedValue({
      ...templatePromo,
      channel: 'PUSH',
    });

    jest.spyOn(notificationRepository, 'create').mockImplementation(async (data) => ({
      id: 'notif-suppressed-push',
      ...data,
      createdAt: new Date(),
    }));

    const res = await request(app)
      .post('/api/v1/notifications/send')
      .set('X-API-Key', rawKey)
      .send({
        channel: 'PUSH',
        template: 'promo-sale',
        category: 'TRANSACTIONAL',
        recipient: {
          externalUserId: 'user_12345',
        },
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('SUPPRESSED');
    expect(res.body.data.suppressionReason).toBe('NO_ACTIVE_DEVICE');
  });
});
