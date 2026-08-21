const { Queue } = require('bullmq');
const { connection, defaultJobOptions } = require('./queue.config');

const NOTIFICATION_QUEUE_NAME = 'notifications';

const NOTIFICATION_MAX_ATTEMPTS = process.env.NOTIFICATION_MAX_ATTEMPTS
  ? parseInt(process.env.NOTIFICATION_MAX_ATTEMPTS, 10)
  : 3;

const NOTIFICATION_RETRY_DELAY = process.env.NOTIFICATION_RETRY_DELAY
  ? parseInt(process.env.NOTIFICATION_RETRY_DELAY, 10)
  : 5000;

const notificationQueue = new Queue(NOTIFICATION_QUEUE_NAME, {
  connection,
  defaultJobOptions,
});

/**
 * Enqueues a notification processing job into BullMQ with exponential backoff retries and optional delay.
 *
 * @param {{ notificationId: string }} payload
 * @param {{ delay?: number, jobId?: string }} options
 * @returns {Promise<import('bullmq').Job>}
 */
const addNotificationJob = async ({ notificationId }, options = {}) => {
  const jobOptions = {
    attempts: NOTIFICATION_MAX_ATTEMPTS,
    backoff: {
      type: 'exponential',
      delay: NOTIFICATION_RETRY_DELAY, // 5s initial delay -> 10s -> 20s
    },
  };

  if (options.delay && options.delay > 0) {
    jobOptions.delay = options.delay;
  }
  if (options.jobId) {
    jobOptions.jobId = options.jobId;
  }

  return notificationQueue.add('send-notification', { notificationId }, jobOptions);
};

/**
 * Removes a scheduled delayed job from BullMQ by job ID.
 *
 * @param {string} jobId
 */
const removeNotificationJob = async (jobId) => {
  try {
    const job = await notificationQueue.getJob(jobId);
    if (job) {
      await job.remove();
      return true;
    }
  } catch (err) {
    // Non-blocking catch if job is no longer available
  }
  return false;
};

module.exports = {
  notificationQueue,
  addNotificationJob,
  removeNotificationJob,
  NOTIFICATION_QUEUE_NAME,
  NOTIFICATION_MAX_ATTEMPTS,
  NOTIFICATION_RETRY_DELAY,
};
