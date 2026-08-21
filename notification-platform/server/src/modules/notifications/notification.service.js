const notificationRepository = require('./notification.repository');
const templateRepository = require('../templates/template.repository');
const templateRenderer = require('../templates/template.renderer');
const { addNotificationJob, removeNotificationJob } = require('../../queues/notification.queue');
const analyticsService = require('../analytics/analytics.service');
const webhookService = require('../webhooks/webhook.service');
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
    if (!recipient || typeof recipient !== 'string' || recipient.trim().length === 0) {
      throw new ValidationError('Recipient identifier is required');
    }
    if (channel === 'EMAIL') {
      if (!EMAIL_REGEX.test(recipient)) {
        throw new ValidationError(NOTIFICATION_MESSAGES.INVALID_RECIPIENT_EMAIL);
      }
    } else if (channel === 'SMS' || channel === 'WHATSAPP') {
      const sanitized = recipient.replace(/[\s-]/g, '');
      if (!PHONE_REGEX.test(sanitized)) {
        throw new ValidationError(NOTIFICATION_MESSAGES.INVALID_RECIPIENT_PHONE);
      }
    } else if (channel === 'PUSH') {
      if (recipient.trim().length === 0) {
        throw new ValidationError('Recipient device token is required for Push notifications');
      }
    }
  }

  /**
   * Asynchronous notification dispatch service method with idempotency and scheduling protection.
   */
  async sendNotification({ projectId, channel = null, templateName, recipient, data = {}, idempotencyKey = null, scheduledAt = null }) {
    // 1. Validate & sanitize idempotency key format if present
    const validKey = validateIdempotencyKey(idempotencyKey);
    const requestHash = computeRequestHash({ channel, template: templateName, recipient, data, scheduledAt });

    // 2. Validate scheduledAt timestamp if present
    let isScheduled = false;
    let scheduledDate = null;
    let delayMs = 0;

    if (scheduledAt) {
      scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        throw new ValidationError('Invalid scheduledAt timestamp format');
      }

      const now = Date.now();
      if (scheduledDate.getTime() < now + 500) {
        throw new ValidationError('scheduledAt must be a future timestamp', null, 'SCHEDULED_TIME_IN_PAST');
      }

      // Max future schedule window (365 days)
      if (scheduledDate.getTime() > now + 365 * 24 * 60 * 60 * 1000) {
        throw new ValidationError('scheduledAt cannot exceed 365 days in the future', null, 'SCHEDULED_TIME_TOO_FAR');
      }

      isScheduled = true;
      delayMs = scheduledDate.getTime() - now;
    }

    const initialStatus = isScheduled ? NOTIFICATION_STATUS.SCHEDULED : NOTIFICATION_STATUS.PENDING;

    // 3. Check for existing idempotent notification
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
          scheduledAt: existing.scheduledAt,
          createdAt: existing.createdAt,
        };
      }
    }

    // 4. Resolve template within project scope
    const template = await templateRepository.findByNameAndProjectId(templateName, projectId);
    if (!template) {
      throw new NotFoundError(`Template "${templateName}" not found in project`);
    }

    const targetChannel = channel || template.channel;

    // 5. Validate Template & Channel Compatibility
    if (channel && template.channel !== channel) {
      throw new ValidationError(
        `Template "${templateName}" is configured for channel "${template.channel}" but requested channel is "${channel}"`,
        null,
        'TEMPLATE_CHANNEL_MISMATCH'
      );
    }

    // 6. Validate recipient format for target channel
    this.validateRecipient(targetChannel, recipient);

    // 7. Render template subject and body
    const rendered = templateRenderer.renderTemplate(
      { subject: template.subject, body: template.body },
      data
    );

    // 8. Create initial Notification record
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
        channel: targetChannel,
        recipient,
        status: initialStatus,
        idempotencyKey: validKey,
        requestHash,
        metadata: initialMetadata,
        scheduledAt: isScheduled ? scheduledDate : null,
      });

      // Non-blocking usage metering record for notification creation
      analyticsService
        .recordUsageEvent({
          projectId,
          date: notification.createdAt,
          channel: notification.channel,
          counterField: 'totalCount',
        })
        .catch(() => {});
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
            scheduledAt: existing.scheduledAt,
            createdAt: existing.createdAt,
          };
        }
      }
      throw createErr;
    }

    // 8. Enqueue job into BullMQ (Delayed job if scheduled, immediate job if not)
    try {
      const jobOptions = isScheduled
        ? { delay: delayMs, jobId: `scheduled:${notification.id}` }
        : {};

      await addNotificationJob({ notificationId: notification.id }, jobOptions);
    } catch (queueError) {
      await notificationRepository.updateStatus(notification.id, {
        status: NOTIFICATION_STATUS.FAILED,
        failedAt: new Date(),
      });
      throw new AppError('Failed to enqueue notification for processing', 500);
    }

    // 9. Dispatch customer webhook for scheduled lifecycle event if applicable
    if (isScheduled) {
      const scheduledEvent = {
        id: `evt_sch_${notification.id}`,
        projectId,
        type: 'SCHEDULED',
        createdAt: new Date(),
      };
      webhookService.dispatchCustomerWebhooksForEvent(scheduledEvent, notification).catch(() => {});
    }

    // 10. Return immediate accepted response
    return {
      id: notification.id,
      status: notification.status,
      channel: notification.channel,
      recipient: notification.recipient,
      scheduledAt: notification.scheduledAt,
      createdAt: notification.createdAt,
    };
  }

  /**
   * Cancels a scheduled notification.
   */
  async cancelNotification({ projectId, notificationId }) {
    const notification = await notificationRepository.findByIdAndProjectId(notificationId, projectId);
    if (!notification) {
      throw new NotFoundError(NOTIFICATION_MESSAGES.NOT_FOUND);
    }

    if (notification.status === 'CANCELLED') {
      throw new ConflictError(
        'Notification is already cancelled',
        null,
        'NOTIFICATION_ALREADY_CANCELLED'
      );
    }

    if (notification.status !== 'SCHEDULED') {
      throw new ConflictError(
        'Only scheduled notifications can be cancelled',
        null,
        'NOTIFICATION_NOT_CANCELLABLE'
      );
    }

    // 1. Atomically update DB status to CANCELLED
    await notificationRepository.cancelScheduledNotification(notificationId, projectId);

    // 2. Best-effort remove delayed BullMQ job
    await removeNotificationJob(`scheduled:${notificationId}`);

    // 3. Dispatch customer webhook for cancelled event
    const cancelledEvent = {
      id: `evt_cnl_${notificationId}`,
      projectId,
      type: 'CANCELLED',
      createdAt: new Date(),
    };
    webhookService.dispatchCustomerWebhooksForEvent(cancelledEvent, notification).catch(() => {});

    return {
      id: notificationId,
      status: 'CANCELLED',
      cancelledAt: new Date(),
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
