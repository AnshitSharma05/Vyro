const notificationRepository = require('./notification.repository');
const templateRepository = require('../templates/template.repository');
const templateRenderer = require('../templates/template.renderer');
const { addNotificationJob } = require('../../queues/notification.queue');
const { validateIdempotencyKey, computeRequestHash } = require('../../shared/utils/idempotency.utils');
const NotFoundError = require('../../shared/errors/not-found-error');
const ValidationError = require('../../shared/errors/validation-error');
const ConflictError = require('../../shared/errors/conflict-error');
const AppError = require('../../shared/errors/app-error');
const ErrorCodes = require('../../shared/constants/error-codes');
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
   * Asynchronous notification dispatch service method with idempotency protection.
   */
  async sendNotification({ projectId, templateName, recipient, data = {}, idempotencyKey = null }) {
    // 1. Validate & sanitize idempotency key format if present
    const validKey = validateIdempotencyKey(idempotencyKey);
    const requestHash = computeRequestHash({ template: templateName, recipient, data });

    // 2. Check for existing idempotent notification
    if (validKey) {
      const existing = await notificationRepository.findByIdempotencyKey(projectId, validKey);
      if (existing) {
        // Verify request fingerprint hash matches
        if (existing.requestHash && existing.requestHash !== requestHash) {
          throw new ConflictError(
            'The idempotency key was already used with a different request',
            null,
            ErrorCodes.IDEMPOTENCY_KEY_REUSED
          );
        }

        // Return existing notification metadata (Replay)
        return {
          id: existing.id,
          status: existing.status,
          channel: existing.channel,
          recipient: existing.recipient,
          createdAt: existing.createdAt,
        };
      }
    }

    // 3. Resolve template within project scope
    const template = await templateRepository.findByNameAndProjectId(templateName, projectId);
    if (!template) {
      throw new NotFoundError(`Template "${templateName}" not found in project`);
    }

    // 4. Validate recipient format for channel
    this.validateRecipient(template.channel, recipient);

    // 5. Render template subject and body
    const rendered = templateRenderer.renderTemplate(
      { subject: template.subject, body: template.body },
      data
    );

    // 6. Create initial Notification record with status PENDING and idempotency metadata
    const initialMetadata = {
      subject: rendered.subject,
      body: rendered.body,
      templateName: template.name,
      templateData: data,
    };

    let notification;
    try {
      notification = await notificationRepository.create({
        projectId,
        templateId: template.id,
        channel: template.channel,
        recipient,
        status: NOTIFICATION_STATUS.PENDING,
        idempotencyKey: validKey,
        requestHash,
        metadata: initialMetadata,
      });
    } catch (createErr) {
      // Catch concurrent unique constraint violation (P2002) for idempotency key
      if (validKey && createErr.code === 'P2002') {
        const existing = await notificationRepository.findByIdempotencyKey(projectId, validKey);
        if (existing) {
          if (existing.requestHash && existing.requestHash !== requestHash) {
            throw new ConflictError(
              'The idempotency key was already used with a different request',
              null,
              ErrorCodes.IDEMPOTENCY_KEY_REUSED
            );
          }
          return {
            id: existing.id,
            status: existing.status,
            channel: existing.channel,
            recipient: existing.recipient,
            createdAt: existing.createdAt,
          };
        }
      }
      throw createErr;
    }

    // 7. Enqueue job into BullMQ for asynchronous background processing
    try {
      await addNotificationJob({ notificationId: notification.id });
    } catch (queueError) {
      await notificationRepository.updateStatus(notification.id, {
        status: NOTIFICATION_STATUS.FAILED,
        failedAt: new Date(),
      });
      throw new AppError('Failed to enqueue notification for processing', 500);
    }

    // 8. Return immediate pending response
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
