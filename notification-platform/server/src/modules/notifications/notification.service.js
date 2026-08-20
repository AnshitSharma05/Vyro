const notificationRepository = require('./notification.repository');
const templateRepository = require('../templates/template.repository');
const templateRenderer = require('../templates/template.renderer');
const providerFactory = require('../../providers/provider.factory');
const NotFoundError = require('../../shared/errors/not-found-error');
const ValidationError = require('../../shared/errors/validation-error');
const { NOTIFICATION_MESSAGES } = require('./notification.constants');
const { NOTIFICATION_STATUS, ATTEMPT_STATUS } = require('../../shared/constants/notification-status');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

class NotificationService {
  /**
   * Validate recipient string format based on the notification channel.
   */
  validateRecipient(channel, recipient) {
    if (channel === 'EMAIL') {
      if (!EMAIL_REGEX.test(recipient)) {
        throw new ValidationError(NOTIFICATION_MESSAGES.INVALID_RECIPIENT_EMAIL);
      }
    } else if (channel === 'SMS' || channel === 'WHATSAPP') {
      const sanitized = recipient.replace(/[\s-]/g, '');
      if (!PHONE_REGEX.test(sanitized)) {
        throw new ValidationError(NOTIFICATION_MESSAGES.INVALID_RECIPIENT_PHONE);
      }
    }
  }

  /**
   * Core synchronous notification dispatch service method.
   */
  async sendNotification({ projectId, templateName, recipient, data = {} }) {
    // 1. Resolve template within project scope
    const template = await templateRepository.findByNameAndProjectId(templateName, projectId);
    if (!template) {
      throw new NotFoundError(`Template "${templateName}" not found in project`);
    }

    // 2. Validate recipient format for channel
    this.validateRecipient(template.channel, recipient);

    // 3. Render template subject and body
    const rendered = templateRenderer.renderTemplate(
      { subject: template.subject, body: template.body },
      data
    );

    // 4. Create initial Notification record with status PROCESSING and content snapshot
    const initialMetadata = {
      subject: rendered.subject,
      body: rendered.body,
      templateName: template.name,
      templateData: data,
    };

    const notification = await notificationRepository.create({
      projectId,
      templateId: template.id,
      channel: template.channel,
      recipient,
      status: NOTIFICATION_STATUS.PROCESSING,
      metadata: initialMetadata,
    });

    // 5. Select delivery provider instance
    let provider;
    try {
      provider = providerFactory.getProvider(template.channel);
    } catch (providerErr) {
      await notificationRepository.createAttempt({
        notificationId: notification.id,
        provider: 'UNAVAILABLE',
        status: ATTEMPT_STATUS.FAILED,
        errorCode: 'UNSUPPORTED_CHANNEL',
        errorMessage: providerErr.message,
      });

      await notificationRepository.updateStatus(notification.id, {
        status: NOTIFICATION_STATUS.FAILED,
        failedAt: new Date(),
      });

      throw providerErr;
    }

    // 6. Synchronously invoke delivery provider
    try {
      const result = await provider.send({
        recipient,
        subject: rendered.subject,
        body: rendered.body,
        metadata: initialMetadata,
      });

      // Record successful delivery attempt
      await notificationRepository.createAttempt({
        notificationId: notification.id,
        provider: result.provider || provider.name,
        status: ATTEMPT_STATUS.SUCCESS,
        deliveredAt: new Date(),
      });

      // Update status to SENT
      const updated = await notificationRepository.updateStatus(notification.id, {
        status: NOTIFICATION_STATUS.SENT,
        sentAt: new Date(),
      });

      return {
        id: updated.id,
        status: updated.status,
        channel: updated.channel,
        recipient: updated.recipient,
        createdAt: updated.createdAt,
        sentAt: updated.sentAt,
      };
    } catch (deliveryError) {
      // Record failed delivery attempt
      await notificationRepository.createAttempt({
        notificationId: notification.id,
        provider: provider.name || 'UNKNOWN_PROVIDER',
        status: ATTEMPT_STATUS.FAILED,
        errorCode: deliveryError.errorCode || 'DELIVERY_FAILED',
        errorMessage: deliveryError.message,
      });

      // Update status to FAILED
      await notificationRepository.updateStatus(notification.id, {
        status: NOTIFICATION_STATUS.FAILED,
        failedAt: new Date(),
      });

      throw deliveryError;
    }
  }

  async listNotifications({ projectId, page = 1, limit = 20, status, channel, recipient }) {
    return notificationRepository.findManyByProjectId({
      projectId,
      page,
      limit,
      status,
      channel,
      recipient,
    });
  }

  async getNotification({ projectId, notificationId }) {
    const notification = await notificationRepository.findByIdAndProjectId(notificationId, projectId);
    if (!notification) {
      throw new NotFoundError(NOTIFICATION_MESSAGES.NOT_FOUND);
    }
    return notification;
  }
}

module.exports = new NotificationService();
