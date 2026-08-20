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
 * Enqueues a notification processing job into BullMQ with exponential backoff retries.
 *
 * @param {{ notificationId: string }} payload
 * @returns {Promise<import('bullmq').Job>}
 */
const addNotificationJob = async ({ notificationId }) => {
  return notificationQueue.add(
    'send-notification',
    { notificationId },
    {
      attempts: NOTIFICATION_MAX_ATTEMPTS,
      backoff: {
        type: 'exponential',
        delay: NOTIFICATION_RETRY_DELAY, // 5s initial delay -> 10s -> 20s
      },
    }
  );
};

module.exports = {
  notificationQueue,
  addNotificationJob,
  NOTIFICATION_QUEUE_NAME,
  NOTIFICATION_MAX_ATTEMPTS,
  NOTIFICATION_RETRY_DELAY,
};
