const { Worker, UnrecoverableError } = require('bullmq');
const connection = require('../config/redis');
const config = require('../config/env');
const prisma = require('../config/database');
const notificationRepository = require('../modules/notifications/notification.repository');
const providerFactory = require('../providers/provider.factory');
const logger = require('../shared/utils/logger');
const { classifyError } = require('../shared/utils/error-classifier');
const { NOTIFICATION_STATUS, ATTEMPT_STATUS } = require('../shared/constants/notification-status');
const { NOTIFICATION_QUEUE_NAME, NOTIFICATION_MAX_ATTEMPTS } = require('../queues/notification.queue');

/**
 * Core job execution handler for BullMQ worker with retry classification.
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
  const currentAttemptNumber = existingAttemptsCount + 1;

  // 2. Atomic Status Transition (PENDING or RETRYING -> PROCESSING)
  const transitionResult = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      status: {
        in: [NOTIFICATION_STATUS.PENDING, NOTIFICATION_STATUS.RETRYING],
      },
    },
    data: {
      status: NOTIFICATION_STATUS.PROCESSING,
    },
  });

  if (transitionResult.count === 0) {
    const existing = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (existing && (existing.status === NOTIFICATION_STATUS.SENT || existing.status === NOTIFICATION_STATUS.FAILED)) {
      logger.warn(
        { jobId: job.id, notificationId, status: existing.status },
        'Notification is already terminal. Skipping duplicate job execution.'
      );
      return;
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

  // 4. Select Provider
  let provider;
  try {
    provider = providerFactory.getProvider(notification.channel);
  } catch (providerErr) {
    const { errorCode, message } = classifyError(providerErr);
    await notificationRepository.createAttempt({
      notificationId: notification.id,
      provider: 'UNAVAILABLE',
      status: ATTEMPT_STATUS.FAILED,
      attemptNumber: currentAttemptNumber,
      errorCode,
      errorMessage: message,
    });

    await notificationRepository.updateStatus(notification.id, {
      status: NOTIFICATION_STATUS.FAILED,
      failedAt: new Date(),
    });

    logger.error({ jobId: job.id, notificationId, error: message }, 'Provider unconfigured for channel');
    throw new UnrecoverableError(message);
  }

  // 5. Execute Provider Delivery
  try {
    const result = await provider.send({
      recipient: notification.recipient,
      subject,
      body,
      metadata,
    });

    // Record successful attempt
    await notificationRepository.createAttempt({
      notificationId: notification.id,
      provider: result.provider || provider.name,
      status: ATTEMPT_STATUS.SUCCESS,
      attemptNumber: currentAttemptNumber,
      deliveredAt: new Date(),
    });

    // Update status to SENT
    await notificationRepository.updateStatus(notification.id, {
      status: NOTIFICATION_STATUS.SENT,
      sentAt: new Date(),
    });

    logger.info(
      { jobId: job.id, notificationId, attemptNumber: currentAttemptNumber },
      'Notification delivered successfully by worker'
    );
  } catch (deliveryError) {
    const { retryable, errorCode, message } = classifyError(deliveryError);

    // Record failed attempt
    await notificationRepository.createAttempt({
      notificationId: notification.id,
      provider: provider?.name || 'UNKNOWN_PROVIDER',
      status: ATTEMPT_STATUS.FAILED,
      attemptNumber: currentAttemptNumber,
      errorCode,
      errorMessage: message,
    });

    // Determine if attempt can be retried
    const canRetry = retryable && currentAttemptNumber < NOTIFICATION_MAX_ATTEMPTS;

    if (canRetry) {
      await notificationRepository.updateStatus(notification.id, {
        status: NOTIFICATION_STATUS.RETRYING,
      });

      logger.warn(
        { jobId: job.id, notificationId, attemptNumber: currentAttemptNumber, errorCode, message },
        'Transient provider failure. Scheduling BullMQ retry.'
      );

      // Throwing error allows BullMQ to handle backoff delay & retry
      throw deliveryError;
    } else {
      await notificationRepository.updateStatus(notification.id, {
        status: NOTIFICATION_STATUS.FAILED,
        failedAt: new Date(),
      });

      logger.error(
        { jobId: job.id, notificationId, attemptNumber: currentAttemptNumber, retryable, errorCode, message },
        'Notification delivery failed permanently or max attempts exhausted.'
      );

      // Throw UnrecoverableError so BullMQ halts retries immediately
      throw new UnrecoverableError(message);
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
