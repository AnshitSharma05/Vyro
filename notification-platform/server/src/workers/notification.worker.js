const { Worker, UnrecoverableError } = require('bullmq');
const connection = require('../config/redis');
const config = require('../config/env');
const prisma = require('../config/database');
const notificationRepository = require('../modules/notifications/notification.repository');
const providerRouter = require('../providers/provider.router');
const logger = require('../shared/utils/logger');
const { classifyError } = require('../shared/utils/error-classifier');
const { NOTIFICATION_STATUS, ATTEMPT_STATUS } = require('../shared/constants/notification-status');
const { NOTIFICATION_QUEUE_NAME, NOTIFICATION_MAX_ATTEMPTS } = require('../queues/notification.queue');

/**
 * Core job execution handler for BullMQ worker with retry classification and provider failover.
 *
 * @param {import('bullmq').Job} job
 */
async function processNotificationJob(job) {
  const { notificationId } = job.data;
  if (!notificationId) {
    logger.error({ jobId: job.id }, 'BullMQ job missing notificationId');
    throw new UnrecoverableError('Invalid job payload: missing notificationId');
  }

  // 1. Calculate current attempt number (1-indexed)
  const existingAttemptsCount = await notificationRepository.getAttemptCount(notificationId);
  let currentAttemptNumber = existingAttemptsCount + 1;

  // 2. Atomic Status Transition (SCHEDULED, PENDING, or RETRYING -> PROCESSING)
  const transitionResult = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      status: {
        in: [NOTIFICATION_STATUS.SCHEDULED, NOTIFICATION_STATUS.PENDING, NOTIFICATION_STATUS.RETRYING],
      },
    },
    data: {
      status: NOTIFICATION_STATUS.PROCESSING,
    },
  });

  if (transitionResult.count === 0) {
    const existing = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (existing) {
      if (existing.status === NOTIFICATION_STATUS.CANCELLED) {
        logger.info(
          { jobId: job.id, notificationId },
          'Scheduled notification was cancelled. Skipping worker execution.'
        );
        return;
      }
      if (existing.status === NOTIFICATION_STATUS.SENT || existing.status === NOTIFICATION_STATUS.FAILED || existing.status === NOTIFICATION_STATUS.DELIVERED) {
        logger.warn(
          { jobId: job.id, notificationId, status: existing.status },
          'Notification is already terminal. Skipping duplicate job execution.'
        );
        return;
      }
    }
  }

  // 3. Load Notification record from PostgreSQL
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    logger.error({ jobId: job.id, notificationId }, 'Notification record not found in PostgreSQL');
    throw new UnrecoverableError(`Notification ${notificationId} not found in database`);
  }

  const metadata = notification.metadata || {};
  const subject = metadata.subject;
  const body = metadata.body;

  // 4. Execute Provider Router (Primary -> Fallback Sequence)
  const routeResult = await providerRouter.sendNotificationWithFailover({
    channel: notification.channel,
    recipient: notification.recipient,
    subject,
    body,
    metadata,
  });

  // 5. Record NotificationAttempt entries for each provider attempt (PRIMARY vs FAILOVER)
  for (let i = 0; i < routeResult.attempts.length; i++) {
    const att = routeResult.attempts[i];
    const isSuccess = att.status === 'SUCCESS';

    await notificationRepository.createAttempt({
      notificationId: notification.id,
      provider: att.provider,
      status: isSuccess ? ATTEMPT_STATUS.SUCCESS : ATTEMPT_STATUS.FAILED,
      attemptNumber: currentAttemptNumber + i,
      attemptReason: att.attemptReason || (i === 0 ? 'PRIMARY' : 'FAILOVER'),
      errorCode: att.errorCode || null,
      errorMessage: att.errorMessage || null,
      deliveredAt: isSuccess ? new Date() : null,
    });
  }

  // 6. Evaluate Final Result
  if (routeResult.success) {
    await notificationRepository.updateStatus(notification.id, {
      status: NOTIFICATION_STATUS.SENT,
      sentAt: new Date(),
    });

    logger.info(
      { jobId: job.id, notificationId, provider: routeResult.provider, failoverTriggered: routeResult.failoverTriggered },
      'Notification delivered successfully by worker'
    );
  } else {
    const deliveryError = routeResult.error || new Error('Provider delivery failed');
    const { retryable, errorCode, message } = classifyError(deliveryError);

    const canRetry = retryable && currentAttemptNumber < NOTIFICATION_MAX_ATTEMPTS;

    if (canRetry) {
      await notificationRepository.updateStatus(notification.id, {
        status: NOTIFICATION_STATUS.RETRYING,
      });

      logger.warn(
        { jobId: job.id, notificationId, attemptNumber: currentAttemptNumber, errorCode, message },
        'Transient provider failure across primary and fallback. Scheduling BullMQ retry.'
      );

      throw deliveryError;
    } else {
      await notificationRepository.updateStatus(notification.id, {
        status: NOTIFICATION_STATUS.FAILED,
        failedAt: new Date(),
      });

      logger.error(
        { jobId: job.id, notificationId, errorCode, message },
        'Permanent failure across all providers or max retry limit reached'
      );

      throw new UnrecoverableError(`Notification delivery failed permanently: ${message}`);
    }
  }
}

/**
 * Creates and initializes the BullMQ Worker instance.
 *
 * @returns {import('bullmq').Worker}
 */
function createNotificationWorker() {
  const worker = new Worker(NOTIFICATION_QUEUE_NAME, processNotificationJob, {
    connection,
    concurrency: config.WORKER_CONCURRENCY || 5,
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'BullMQ notification job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err?.message }, 'BullMQ notification job failed');
  });

  worker.on('error', (err) => {
    logger.error({ error: err?.message }, 'BullMQ worker error');
  });

  return worker;
}

module.exports = {
  createNotificationWorker,
  processNotificationJob,
};
