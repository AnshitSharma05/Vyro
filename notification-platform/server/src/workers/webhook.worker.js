const { Worker, UnrecoverableError } = require('bullmq');
const crypto = require('crypto');
const connection = require('../config/redis');
const config = require('../config/env');
const prisma = require('../config/database');
const logger = require('../shared/utils/logger');
const { validateWebhookUrl } = require('../shared/utils/ssrf-protection');
const { WEBHOOK_QUEUE_NAME, WEBHOOK_MAX_ATTEMPTS } = require('../queues/webhook.queue');

/**
 * Core job execution handler for Customer Webhook Delivery Worker.
 *
 * @param {import('bullmq').Job} job
 */
async function processWebhookDeliveryJob(job) {
  const { webhookDeliveryId } = job.data;
  if (!webhookDeliveryId) {
    throw new UnrecoverableError('Invalid job payload: missing webhookDeliveryId');
  }

  // 1. Load WebhookDelivery record from PostgreSQL
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: webhookDeliveryId },
    include: { webhook: true },
  });

  if (!delivery || !delivery.webhook) {
    throw new UnrecoverableError(`WebhookDelivery ${webhookDeliveryId} or parent Webhook not found`);
  }

  if (delivery.status === 'SUCCESS') {
    logger.warn({ jobId: job.id, webhookDeliveryId }, 'WebhookDelivery is already terminal SUCCESS. Skipping.');
    return;
  }

  const { webhook } = delivery;

  if (!webhook.active) {
    logger.warn({ jobId: job.id, webhookId: webhook.id }, 'Webhook endpoint is inactive. Marking delivery FAILED.');
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: { status: 'FAILED', responseBody: 'Webhook endpoint is disabled/inactive' },
    });
    return;
  }

  // 2. Validate destination URL against SSRF rules
  let validUrl;
  try {
    validUrl = validateWebhookUrl(webhook.url);
  } catch (urlErr) {
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: { status: 'FAILED', responseBody: `SSRF Validation Error: ${urlErr.message}` },
    });
    throw new UnrecoverableError(`SSRF Validation Error: ${urlErr.message}`);
  }

  // 3. Construct HMAC Signature and Headers
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const rawPayloadString = JSON.stringify(delivery.payload);
  const signature = crypto
    .createHmac('sha256', webhook.secret)
    .update(`${timestamp}.${rawPayloadString}`)
    .digest('hex');

  const headers = {
    'Content-Type': 'application/json',
    'X-Notification-Signature': signature,
    'X-Notification-Timestamp': timestamp,
    'X-Notification-Delivery-Id': delivery.id,
    'User-Agent': 'NotificationPlatform-WebhookWorker/1.0',
  };

  // 4. Dispatch Outbound HTTP Request with 5000ms Timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  let response;
  let responseText = '';
  let responseStatus = null;
  const currentAttempt = job.attemptsMade + 1;

  try {
    response = await fetch(validUrl, {
      method: 'POST',
      headers,
      body: rawPayloadString,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    responseStatus = response.status;
    try {
      responseText = await response.text();
      if (responseText.length > 500) {
        responseText = responseText.substring(0, 497) + '...';
      }
    } catch (_) {
      responseText = '';
    }

    if (response.ok) {
      // 2xx Success Response
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'SUCCESS',
          responseStatus,
          responseBody: responseText || 'OK',
          attemptCount: currentAttempt,
          deliveredAt: new Date(),
        },
      });

      logger.info(
        { jobId: job.id, webhookDeliveryId: delivery.id, httpStatus: responseStatus },
        'Customer webhook delivered successfully'
      );
      return;
    }

    // 4xx / 5xx Non-OK HTTP Response
    const isRetryable = responseStatus >= 500 || responseStatus === 429;
    const canRetry = isRetryable && currentAttempt < WEBHOOK_MAX_ATTEMPTS;

    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'FAILED',
        responseStatus,
        responseBody: responseText || `HTTP Error ${responseStatus}`,
        attemptCount: currentAttempt,
      },
    });

    if (canRetry) {
      logger.warn(
        { jobId: job.id, webhookDeliveryId: delivery.id, httpStatus: responseStatus, attempt: currentAttempt },
        'Transient customer webhook HTTP failure. Scheduling retry.'
      );
      throw new Error(`Customer webhook responded with HTTP ${responseStatus}`);
    } else {
      logger.error(
        { jobId: job.id, webhookDeliveryId: delivery.id, httpStatus: responseStatus, attempt: currentAttempt },
        'Customer webhook delivery failed permanently or max attempts exhausted.'
      );
      throw new UnrecoverableError(`Customer webhook failed permanently with HTTP ${responseStatus}`);
    }
  } catch (netErr) {
    clearTimeout(timeout);

    const errorMessage = netErr.name === 'AbortError' ? 'HTTP Request Timeout (5000ms)' : netErr.message;
    const canRetry = currentAttempt < WEBHOOK_MAX_ATTEMPTS;

    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'FAILED',
        responseStatus: responseStatus || null,
        responseBody: errorMessage,
        attemptCount: currentAttempt,
      },
    });

    if (canRetry) {
      logger.warn(
        { jobId: job.id, webhookDeliveryId: delivery.id, error: errorMessage, attempt: currentAttempt },
        'Network error during customer webhook delivery. Scheduling retry.'
      );
      throw netErr;
    } else {
      logger.error(
        { jobId: job.id, webhookDeliveryId: delivery.id, error: errorMessage, attempt: currentAttempt },
        'Network error during customer webhook delivery. Max attempts exhausted.'
      );
      throw new UnrecoverableError(errorMessage);
    }
  }
}

/**
 * Creates and initializes the BullMQ Worker instance for customer webhooks.
 *
 * @returns {import('bullmq').Worker}
 */
function createWebhookWorker() {
  const worker = new Worker(WEBHOOK_QUEUE_NAME, processWebhookDeliveryJob, {
    connection,
    concurrency: config.WORKER_CONCURRENCY || 5,
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'BullMQ customer webhook job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err?.message }, 'BullMQ customer webhook job failed');
  });

  return worker;
}

module.exports = {
  createWebhookWorker,
  processWebhookDeliveryJob,
};
