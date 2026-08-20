const notificationService = require('../../src/modules/notifications/notification.service');
const notificationRepository = require('../../src/modules/notifications/notification.repository');
const templateRepository = require('../../src/modules/templates/template.repository');
const providerFactory = require('../../src/providers/provider.factory');
const NotFoundError = require('../../src/shared/errors/not-found-error');
const ValidationError = require('../../src/shared/errors/validation-error');
const ProviderError = require('../../src/shared/errors/provider-error');

jest.mock('../../src/modules/notifications/notification.repository');
jest.mock('../../src/modules/templates/template.repository');
jest.mock('../../src/providers/provider.factory');

describe('Notification Service Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockEmailTemplate = {
    id: 'tpl-1',
    projectId: 'proj-123',
    name: 'order-confirmed',
    channel: 'EMAIL',
    subject: 'Order {{orderId}} Confirmed',
    body: 'Hello {{name}}, order {{orderId}} is confirmed.',
  };

  const mockSmsTemplate = {
    id: 'tpl-2',
    projectId: 'proj-123',
    name: 'otp-send',
    channel: 'SMS',
    subject: null,
    body: 'Your OTP is {{otp}}',
  };

  describe('sendNotification', () => {
    it('should successfully process, render, send, and mark notification SENT', async () => {
      templateRepository.findByNameAndProjectId.mockResolvedValue(mockEmailTemplate);
      notificationRepository.create.mockResolvedValue({
        id: 'notif-1',
        projectId: 'proj-123',
        channel: 'EMAIL',
        recipient: 'anshit@example.com',
        status: 'PROCESSING',
        createdAt: new Date(),
      });

      const mockProvider = {
        name: 'EMAIL_NODEMAILER',
        send: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-123', provider: 'EMAIL_NODEMAILER' }),
      };
      providerFactory.getProvider.mockReturnValue(mockProvider);

      notificationRepository.createAttempt.mockResolvedValue({});
      notificationRepository.updateStatus.mockResolvedValue({
        id: 'notif-1',
        status: 'SENT',
        channel: 'EMAIL',
        recipient: 'anshit@example.com',
        createdAt: new Date(),
        sentAt: new Date(),
      });

      const result = await notificationService.sendNotification({
        projectId: 'proj-123',
        templateName: 'order-confirmed',
        recipient: 'anshit@example.com',
        data: { name: 'Anshit', orderId: 'ORD-123' },
      });

      expect(result.status).toBe('SENT');
      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: 'anshit@example.com',
          subject: 'Order ORD-123 Confirmed',
          body: 'Hello Anshit, order ORD-123 is confirmed.',
        })
      );
      expect(notificationRepository.createAttempt).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'SUCCESS' })
      );
    });

    it('should throw NotFoundError if requested template does not exist in project', async () => {
      templateRepository.findByNameAndProjectId.mockResolvedValue(null);

      await expect(
        notificationService.sendNotification({
          projectId: 'proj-123',
          templateName: 'non-existent',
          recipient: 'user@example.com',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError if recipient email format is invalid', async () => {
      templateRepository.findByNameAndProjectId.mockResolvedValue(mockEmailTemplate);

      await expect(
        notificationService.sendNotification({
          projectId: 'proj-123',
          templateName: 'order-confirmed',
          recipient: 'invalid-email-address',
          data: { name: 'Anshit', orderId: 'ORD-1' },
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if data payload misses required variables', async () => {
      templateRepository.findByNameAndProjectId.mockResolvedValue(mockEmailTemplate);

      await expect(
        notificationService.sendNotification({
          projectId: 'proj-123',
          templateName: 'order-confirmed',
          recipient: 'anshit@example.com',
          data: { name: 'Anshit' }, // missing orderId
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should mark status FAILED and record FAILED attempt when provider delivery fails', async () => {
      templateRepository.findByNameAndProjectId.mockResolvedValue(mockEmailTemplate);
      notificationRepository.create.mockResolvedValue({ id: 'notif-failed' });

      const mockProvider = {
        name: 'EMAIL_NODEMAILER',
        send: jest.fn().mockRejectedValue(new Error('SMTP Transport Error')),
      };
      providerFactory.getProvider.mockReturnValue(mockProvider);

      await expect(
        notificationService.sendNotification({
          projectId: 'proj-123',
          templateName: 'order-confirmed',
          recipient: 'anshit@example.com',
          data: { name: 'Anshit', orderId: 'ORD-123' },
        })
      ).rejects.toThrow('SMTP Transport Error');

      expect(notificationRepository.createAttempt).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'FAILED' })
      );
      expect(notificationRepository.updateStatus).toHaveBeenCalledWith(
        'notif-failed',
        expect.objectContaining({ status: 'FAILED' })
      );
    });

    it('should throw ProviderError when provider for channel is unsupported', async () => {
      templateRepository.findByNameAndProjectId.mockResolvedValue(mockSmsTemplate);
      notificationRepository.create.mockResolvedValue({ id: 'notif-sms' });
      providerFactory.getProvider.mockImplementation(() => {
        throw new ProviderError('Delivery provider for SMS channel is not configured', 422);
      });

      await expect(
        notificationService.sendNotification({
          projectId: 'proj-123',
          templateName: 'otp-send',
          recipient: '+1234567890',
          data: { otp: '9999' },
        })
      ).rejects.toThrow(ProviderError);

      expect(notificationRepository.updateStatus).toHaveBeenCalledWith(
        'notif-sms',
        expect.objectContaining({ status: 'FAILED' })
      );
    });
  });
});
