const request = require('supertest');
const app = require('../../src/app');
const NotificationClient = require('../../sdk/node/src/client');
const { AuthenticationError } = require('../../sdk/node/src/errors');
const projectRepository = require('../../src/modules/projects/project.repository');
const apiKeyRepository = require('../../src/modules/api-keys/api-key.repository');
const notificationService = require('../../src/modules/notifications/notification.service');
const eventService = require('../../src/modules/events/event.service');
const { generateApiKey, hashApiKey } = require('../../src/modules/api-keys/api-key.utils');

describe('SDK INTEGRATION TESTS WITH LIVE BACKEND (PHASE 20)', () => {
  let server;
  let baseUrl;
  let rawKey;
  let keyPrefix;

  const projectA = {
    id: 'proj_sdk_1000-0000-0000-0000-000000000001',
    organizationId: 'org_sdk_1',
    name: 'SDK Project A',
    slug: 'sdk-proj-a',
  };

  beforeAll((done) => {
    const keys = generateApiKey();
    rawKey = keys.rawKey;
    keyPrefix = keys.keyPrefix;

    const apiKeyRecord = {
      id: 'key-sdk-all',
      projectId: projectA.id,
      name: 'SDK Key',
      keyPrefix,
      keyHash: hashApiKey(rawKey),
      scopes: [
        'notifications:send',
        'notifications:read',
        'events:write',
        'events:read',
        'recipients:read',
        'recipients:write',
        'workflows:read',
        'workflows:write',
      ],
      revokedAt: null,
      expiresAt: null,
      createdAt: new Date(),
      project: projectA,
    };

    jest.spyOn(projectRepository, 'findProjectById').mockResolvedValue(projectA);
    jest.spyOn(apiKeyRepository, 'findByPrefix').mockImplementation(async (prefix) => {
      if (prefix === keyPrefix) return [apiKeyRecord];
      return [];
    });
    jest.spyOn(apiKeyRepository, 'updateLastUsedAt').mockResolvedValue({});

    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}/api/v1`;
      done();
    });
  });

  afterAll((done) => {
    jest.restoreAllMocks();
    server.close(done);
  });

  it('1. SDK client.notifications.send() sends notification successfully to backend API', async () => {
    jest.spyOn(notificationService, 'sendNotification').mockResolvedValue({
      id: 'notif_sdk_100',
      status: 'PENDING',
      channel: 'EMAIL',
      recipient: 'sdkuser@example.com',
      createdAt: new Date(),
    });

    const client = new NotificationClient({
      apiKey: rawKey,
      baseURL: baseUrl,
    });

    const res = await client.notifications.send({
      template: 'welcome-email',
      channel: 'EMAIL',
      recipient: 'sdkuser@example.com',
      data: { name: 'SDK Developer' },
    });

    expect(res.id).toBe('notif_sdk_100');
    expect(res.status).toBe('PENDING');
  });

  it('2. SDK client.events.track() tracks business event successfully to backend API', async () => {
    jest.spyOn(eventService, 'ingestEvent').mockResolvedValue({
      eventId: 'evt_sdk_999',
      status: 'RECEIVED',
      replayed: false,
    });

    const client = new NotificationClient({
      apiKey: rawKey,
      baseURL: baseUrl,
    });

    const res = await client.events.track({
      event: 'ORDER_CREATED',
      externalEventId: 'order_sdk_123_created',
      recipient: 'sdkuser@example.com',
      data: { amount: 99.99 },
    });

    expect(res.eventId).toBe('evt_sdk_999');
    expect(res.status).toBe('RECEIVED');
  });

  it('3. SDK throws AuthenticationError (401) when invalid API key is supplied', async () => {
    const invalidClient = new NotificationClient({
      apiKey: 'invalid_key_prefix.invalid_secret',
      baseURL: baseUrl,
    });

    await expect(
      invalidClient.notifications.send({
        template: 'welcome-email',
        recipient: 'sdkuser@example.com',
      })
    ).rejects.toThrow(AuthenticationError);
  });
});
