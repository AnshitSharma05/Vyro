const notificationRepository = require('../../src/modules/notifications/notification.repository');
const providerRouter = require('../../src/providers/provider.router');
const { processNotificationJob } = require('../../src/workers/notification.worker');
const prisma = require('../../src/config/database');

describe('PROVIDER FAILOVER INTEGRATION TESTS (PHASE 16)', () => {
  const originalPrimaryMode = process.env.MOCK_SMS_MODE;
  const originalFallbackMode = process.env.MOCK_FALLBACK_MODE;

  const mockNotification = {
    id: 'notif-fo-100',
    projectId: 'proj-fo-1',
    channel: 'SMS',
    recipient: '+919999999999',
    status: 'PENDING',
    metadata: {
      subject: null,
      body: 'Test failover notification',
    },
  };

  const loggedAttempts = [];

  beforeAll(() => {
    jest.spyOn(prisma.notification, 'updateMany').mockResolvedValue({ count: 1 });
    jest.spyOn(prisma.notification, 'findUnique').mockImplementation(async ({ where }) => {
      if (where.id === mockNotification.id) return mockNotification;
      return null;
    });

    jest.spyOn(notificationRepository, 'getAttemptCount').mockImplementation(async () => loggedAttempts.length);

    jest.spyOn(notificationRepository, 'createAttempt').mockImplementation(async (data) => {
      loggedAttempts.push(data);
      return { id: `att-${loggedAttempts.length}`, ...data };
    });

    jest.spyOn(notificationRepository, 'updateStatus').mockImplementation(async (id, data) => {
      mockNotification.status = data.status;
      return mockNotification;
    });
  });

  beforeEach(() => {
    loggedAttempts.length = 0;
    mockNotification.status = 'PENDING';
    process.env.MOCK_SMS_MODE = originalPrimaryMode;
    process.env.MOCK_FALLBACK_MODE = originalFallbackMode;
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('1. Executes primary provider failure followed by successful fallback, recording 2 NotificationAttempts', async () => {
    process.env.MOCK_SMS_MODE = 'failure';

    await processNotificationJob({ id: 'job-fo-1', data: { notificationId: mockNotification.id } });

    expect(mockNotification.status).toBe('SENT');
    expect(loggedAttempts.length).toBe(2);

    expect(loggedAttempts[0].provider).toBe('mock-sms');
    expect(loggedAttempts[0].status).toBe('FAILED');
    expect(loggedAttempts[0].attemptReason).toBe('PRIMARY');

    expect(loggedAttempts[1].provider).toBe('mock-sms-fallback');
    expect(loggedAttempts[1].status).toBe('SUCCESS');
    expect(loggedAttempts[1].attemptReason).toBe('FAILOVER');
  });

  it('2. Preserves single notificationId across primary and fallback attempts', async () => {
    process.env.MOCK_SMS_MODE = 'failure';

    await processNotificationJob({ id: 'job-fo-2', data: { notificationId: mockNotification.id } });

    expect(loggedAttempts[0].notificationId).toBe(mockNotification.id);
    expect(loggedAttempts[1].notificationId).toBe(mockNotification.id);
  });
});
