const { processNotificationJob } = require('../../src/workers/notification.worker');
const prisma = require('../../src/config/database');
const notificationRepository = require('../../src/modules/notifications/notification.repository');
const providerFactory = require('../../src/providers/provider.factory');

jest.mock('../../src/config/database', () => ({
  notification: {
    updateMany: jest.fn(),
    findUnique: jest.fn(),
  },
}));

jest.mock('../../src/modules/notifications/notification.repository');
jest.mock('../../src/providers/provider.factory');

describe('Notification Worker Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockJob = {
    id: 'job-101',
    data: { notificationId: 'notif-101' },
  };

  const mockNotificationRecord = {
    id: 'notif-101',
    projectId: 'proj-123',
    channel: 'EMAIL',
    recipient: 'anshit_worker@example.com',
    status: 'PENDING',
    metadata: {
      subject: 'Order ORD-123 Confirmed',
      body: 'Hello Anshit, your order ORD-123 has been confirmed.',
      templateName: 'order-confirmed',
    },
  };

  it('should process job, call provider, log attempt, and update status to SENT', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 1 });
    prisma.notification.findUnique.mockResolvedValue(mockNotificationRecord);

    const mockEmailProvider = {
      name: 'EMAIL_NODEMAILER',
      send: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-worker-1', provider: 'EMAIL_NODEMAILER' }),
    };
    providerFactory.getProvider.mockReturnValue(mockEmailProvider);

    notificationRepository.createAttempt.mockResolvedValue({});
    notificationRepository.updateStatus.mockResolvedValue({});

    await processNotificationJob(mockJob);

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: 'notif-101', status: 'PENDING' },
      data: { status: 'PROCESSING' },
    });

    expect(mockEmailProvider.send).toHaveBeenCalledWith({
      recipient: 'anshit_worker@example.com',
      subject: 'Order ORD-123 Confirmed',
      body: 'Hello Anshit, your order ORD-123 has been confirmed.',
      metadata: mockNotificationRecord.metadata,
    });

    expect(notificationRepository.createAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationId: 'notif-101',
        status: 'SUCCESS',
      })
    );

    expect(notificationRepository.updateStatus).toHaveBeenCalledWith(
      'notif-101',
      expect.objectContaining({ status: 'SENT' })
    );
  });

  it('should skip job processing if atomic status transition returns count = 0 (duplicate execution)', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 0 }); // Already processed

    await processNotificationJob(mockJob);

    expect(prisma.notification.findUnique).not.toHaveBeenCalled();
    expect(providerFactory.getProvider).not.toHaveBeenCalled();
  });

  it('should log FAILED attempt and update status to FAILED when provider throws an error', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 1 });
    prisma.notification.findUnique.mockResolvedValue(mockNotificationRecord);

    const mockFailingProvider = {
      name: 'EMAIL_NODEMAILER',
      send: jest.fn().mockRejectedValue(new Error('SMTP Transport Timeout')),
    };
    providerFactory.getProvider.mockReturnValue(mockFailingProvider);

    await processNotificationJob(mockJob);

    expect(notificationRepository.createAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationId: 'notif-101',
        status: 'FAILED',
        errorMessage: 'SMTP Transport Timeout',
      })
    );

    expect(notificationRepository.updateStatus).toHaveBeenCalledWith(
      'notif-101',
      expect.objectContaining({ status: 'FAILED' })
    );
  });
});
