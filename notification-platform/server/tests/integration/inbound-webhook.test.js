const request = require('supertest');
const app = require('../../src/app');
const crypto = require('crypto');
const webhookService = require('../../src/modules/webhooks/webhook.service');
const webhookRepository = require('../../src/modules/webhooks/webhook.repository');
const notificationRepository = require('../../src/modules/notifications/notification.repository');
const prisma = require('../../src/config/database');

describe('INBOUND PROVIDER WEBHOOK INTEGRATION TESTS (PHASE 12)', () => {
  const secret = 'mock_webhook_secret_dev_key';

  const mockNotification = {
    id: 'notif-inbound-101',
    projectId: 'proj-inbound-202',
    channel: 'EMAIL',
    recipient: 'inbound_user@example.com',
    status: 'SENT',
  };

  const inMemoryEvents = [];

  beforeAll(() => {
    jest.spyOn(prisma.notification, 'findUnique').mockImplementation(async ({ where }) => {
      if (where.id === mockNotification.id) return mockNotification;
      return null;
    });

    jest.spyOn(notificationRepository, 'updateStatus').mockImplementation(async (id, data) => {
      if (id === mockNotification.id) mockNotification.status = data.status;
      return mockNotification;
    });

    jest.spyOn(webhookRepository, 'findEventByProviderAndEventId').mockImplementation(async (provider, eventId) => {
      return inMemoryEvents.find((e) => e.provider === provider && e.providerEventId === eventId) || null;
    });

    jest.spyOn(webhookRepository, 'createEvent').mockImplementation(async (data) => {
      const evt = {
        id: `evt-in-${inMemoryEvents.length + 1}`,
        projectId: data.projectId,
        notificationId: data.notificationId,
        provider: data.provider,
        providerEventId: data.providerEventId,
        type: data.type,
        createdAt: new Date(),
      };
      inMemoryEvents.push(evt);
      return evt;
    });

    jest.spyOn(webhookService, 'dispatchCustomerWebhooksForEvent').mockResolvedValue();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('1. POST /api/v1/webhooks/providers/mock with valid signature updates notification status to DELIVERED and stores Event', async () => {
    const payload = {
      providerEventId: 'evt-inbound-999',
      notificationId: mockNotification.id,
      type: 'DELIVERED',
    };
    const rawBody = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    const res = await request(app)
      .post('/api/v1/webhooks/providers/mock')
      .set('X-Provider-Signature', signature)
      .send(payload);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockNotification.status).toBe('DELIVERED');
    expect(inMemoryEvents).toHaveLength(1);
    expect(inMemoryEvents[0].providerEventId).toBe('evt-inbound-999');
  });

  it('2. Inbound webhook duplicate deduplication: Second POST with same providerEventId is acknowledged as duplicate', async () => {
    const payload = {
      providerEventId: 'evt-inbound-999',
      notificationId: mockNotification.id,
      type: 'DELIVERED',
    };
    const rawBody = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    const res = await request(app)
      .post('/api/v1/webhooks/providers/mock')
      .set('X-Provider-Signature', signature)
      .send(payload);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain('already processed');
    expect(inMemoryEvents).toHaveLength(1); // No new Event created
  });

  it('3. Invalid signature returns HTTP 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/v1/webhooks/providers/mock')
      .set('X-Provider-Signature', 'invalid-signature-123')
      .send({ notificationId: mockNotification.id, type: 'DELIVERED' });

    expect(res.statusCode).toBe(401);
  });
});
