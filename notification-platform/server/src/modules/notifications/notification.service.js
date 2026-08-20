const notificationRepository = require('./notification.repository');
const templateRepository = require('../templates/template.repository');
const templateRenderer = require('../templates/template.renderer');
const { addNotificationJob } = require('../../queues/notification.queue');
const NotFoundError = require('../../shared/errors/not-found-error');
const ValidationError = require('../../shared/errors/validation-error');
const AppError = require('../../shared/errors/app-error');
const { NOTIFICATION_MESSAGES } = require('./notification.constants');
const { NOTIFICATION_STATUS } = require('../../shared/constants/notification-status');

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
   * Asynchronous notification dispatch service method.
   * Creates notification with status PENDING, enqueues BullMQ job, and returns immediate pending metadata.
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

    // 4. Create initial Notification record with status PENDING and content snapshot
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
      status: NOTIFICATION_STATUS.PENDING,
      metadata: initialMetadata,
    });

    // 5. Enqueue job into BullMQ for asynchronous background processing
    try {
      await addNotificationJob({ notificationId: notification.id });
    } catch (queueError) {
      await notificationRepository.updateStatus(notification.id, {
        status: NOTIFICATION_STATUS.FAILED,
        failedAt: new Date(),
      });
      throw new AppError('Failed to enqueue notification for processing', 500);
    }

    // 6. Return immediate pending response
    return {
      id: notification.id,
      status: notification.status,
      channel: notification.channel,
      recipient: notification.recipient,
      createdAt: notification.createdAt,
    };
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
