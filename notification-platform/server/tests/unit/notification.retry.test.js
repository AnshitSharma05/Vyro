const { processNotificationJob } = require('../../src/workers/notification.worker');
const prisma = require('../../src/config/database');
const notificationRepository = require('../../src/modules/notifications/notification.repository');
const providerFactory = require('../../src/providers/provider.factory');
const { UnrecoverableError } = require('bullmq');

jest.mock('../../src/config/database', () => ({
  notification: {
    updateMany: jest.fn(),
    findUnique: jest.fn(),
  },
}));

jest.mock('../../src/modules/notifications/notification.repository');
jest.mock('../../src/providers/provider.factory');

describe('Notification Worker Retry Logic Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockJob = {
    id: 'job-retry-1',
    data: { notificationId: 'notif-retry-1' },
  };

  const mockNotificationRecord = {
    id: 'notif-retry-1',
    projectId: 'proj-123',
    channel: 'EMAIL',
    recipient: 'anshit_retry@example.com',
    status: 'PENDING',
    metadata: {
      subject: 'Order ORD-777 Dispatched',
      body: 'Hello Anshit',
    },
  };

  it('1. On transient retryable error (Attempt #1), sets status to RETRYING and throws standard Error', async () => {
    notificationRepository.getAttemptCount.mockResolvedValue(0); // 0 previous attempts -> current attemptNumber = 1
    prisma.notification.updateMany.mockResolvedValue({ count: 1 });
    prisma.notification.findUnique.mockResolvedValue(mockNotificationRecord);

    const transientErr = new Error('SMTP Connection ETIMEDOUT');
    transientErr.code = 'ETIMEDOUT';

    const mockProvider = {
      name: 'EMAIL_NODEMAILER',
      send: jest.fn().mockRejectedValue(transientErr),
    };
    providerFactory.getProvider.mockReturnValue(mockProvider);

    await expect(processNotificationJob(mockJob)).rejects.toThrow('SMTP Connection ETIMEDOUT');

    expect(notificationRepository.createAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationId: 'notif-retry-1',
        status: 'FAILED',
        attemptNumber: 1,
        errorCode: 'ETIMEDOUT',
      })
    );

    expect(notificationRepository.updateStatus).toHaveBeenCalledWith(
      'notif-retry-1',
      expect.objectContaining({ status: 'RETRYING' })
    );
  });

  it('2. On non-retryable error (Attempt #1), sets status to FAILED and throws UnrecoverableError', async () => {
    notificationRepository.getAttemptCount.mockResolvedValue(0);
    prisma.notification.updateMany.mockResolvedValue({ count: 1 });
    prisma.notification.findUnique.mockResolvedValue(mockNotificationRecord);

    const nonRetryableErr = new Error('Invalid email recipient address');
    nonRetryableErr.code = 'INVALID_RECIPIENT';

    const mockProvider = {
      name: 'EMAIL_NODEMAILER',
      send: jest.fn().mockRejectedValue(nonRetryableErr),
    };
    providerFactory.getProvider.mockReturnValue(mockProvider);

    await expect(processNotificationJob(mockJob)).rejects.toThrow(UnrecoverableError);

    expect(notificationRepository.updateStatus).toHaveBeenCalledWith(
      'notif-retry-1',
      expect.objectContaining({ status: 'FAILED' })
    );
  });

  it('3. On max attempt exhaustion (Attempt #3), sets status to FAILED and throws UnrecoverableError', async () => {
    notificationRepository.getAttemptCount.mockResolvedValue(2); // 2 previous attempts -> current attemptNumber = 3
    prisma.notification.updateMany.mockResolvedValue({ count: 1 });
    prisma.notification.findUnique.mockResolvedValue({ ...mockNotificationRecord, status: 'RETRYING' });

    const transientErr = new Error('SMTP Connection ETIMEDOUT');
    transientErr.code = 'ETIMEDOUT';

    const mockProvider = {
      name: 'EMAIL_NODEMAILER',
      send: jest.fn().mockRejectedValue(transientErr),
    };
    providerFactory.getProvider.mockReturnValue(mockProvider);

    await expect(processNotificationJob(mockJob)).rejects.toThrow(UnrecoverableError);

    expect(notificationRepository.createAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationId: 'notif-retry-1',
        status: 'FAILED',
        attemptNumber: 3,
      })
    );

    expect(notificationRepository.updateStatus).toHaveBeenCalledWith(
      'notif-retry-1',
      expect.objectContaining({ status: 'FAILED' })
    );
  });
});
