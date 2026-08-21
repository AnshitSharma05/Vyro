const { Queue } = require('bullmq');
const { connection, defaultJobOptions } = require('./queue.config');

const WEBHOOK_QUEUE_NAME = 'webhook-deliveries';

const WEBHOOK_MAX_ATTEMPTS = process.env.WEBHOOK_MAX_ATTEMPTS
  ? parseInt(process.env.WEBHOOK_MAX_ATTEMPTS, 10)
  : 3;

const WEBHOOK_RETRY_DELAY = process.env.WEBHOOK_RETRY_DELAY
  ? parseInt(process.env.WEBHOOK_RETRY_DELAY, 10)
  : 5000;

const webhookQueue = new Queue(WEBHOOK_QUEUE_NAME, {
  connection,
  defaultJobOptions,
});

/**
 * Enqueues an outbound customer webhook delivery job into BullMQ.
 *
 * @param {{ webhookDeliveryId: string }} payload
 * @returns {Promise<import('bullmq').Job>}
 */
const addWebhookDeliveryJob = async ({ webhookDeliveryId }) => {
  return webhookQueue.add(
    'deliver-webhook',
    { webhookDeliveryId },
    {
      attempts: WEBHOOK_MAX_ATTEMPTS,
      backoff: {
        type: 'exponential',
        delay: WEBHOOK_RETRY_DELAY,
      },
    }
  );
};

module.exports = {
  webhookQueue,
  addWebhookDeliveryJob,
  WEBHOOK_QUEUE_NAME,
  WEBHOOK_MAX_ATTEMPTS,
};
