const crypto = require('crypto');
const webhookRepository = require('./webhook.repository');
const notificationRepository = require('../notifications/notification.repository');
const prisma = require('../../config/database');
const mockWebhookAdapter = require('../../providers/webhooks/mock-webhook.adapter');
const { addWebhookDeliveryJob } = require('../../queues/webhook.queue');
const { validateWebhookUrl } = require('../../shared/utils/ssrf-protection');
const NotFoundError = require('../../shared/errors/not-found-error');
const logger = require('../../shared/utils/logger');

class WebhookService {
  /**
   * Retrieves provider adapter instance.
   */
  getProviderAdapter(providerName) {
    if (providerName === 'mock') {
      return mockWebhookAdapter;
    }
    throw new NotFoundError(`Webhook provider adapter "${providerName}" is not supported`);
  }

  /**
   * Creates a new customer webhook endpoint with a generated secret.
   */
  async createWebhook({ projectId, url }) {
    const validUrl = validateWebhookUrl(url);
    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

    const webhook = await webhookRepository.createWebhook({
      projectId,
      url: validUrl,
      secret,
    });

    return {
      id: webhook.id,
      projectId: webhook.projectId,
      url: webhook.url,
      secret: webhook.secret, // Returned ONCE upon creation
      active: webhook.active,
      createdAt: webhook.createdAt,
    };
  }

  async listWebhooks({ projectId }) {
    return webhookRepository.findWebhooksByProjectId(projectId);
  }

  async getWebhook({ id, projectId }) {
    const webhook = await webhookRepository.findWebhookByIdAndProjectId(id, projectId);
    if (!webhook) {
      throw new NotFoundError('Webhook not found');
    }
    // Omit secret from GET details
    const { secret, ...safeWebhook } = webhook;
    return safeWebhook;
  }

  async updateWebhook({ id, projectId, url, active }) {
    const existing = await webhookRepository.findWebhookByIdAndProjectId(id, projectId);
    if (!existing) {
      throw new NotFoundError('Webhook not found');
    }

    let validUrl = undefined;
    if (url !== undefined) {
      validUrl = validateWebhookUrl(url);
    }

    await webhookRepository.updateWebhook(id, projectId, {
      url: validUrl,
      active,
    });

    return this.getWebhook({ id, projectId });
  }

  async deleteWebhook({ id, projectId }) {
    const existing = await webhookRepository.findWebhookByIdAndProjectId(id, projectId);
    if (!existing) {
      throw new NotFoundError('Webhook not found');
    }
    await webhookRepository.deleteWebhook(id, projectId);
    return { success: true };
  }

  async listWebhookDeliveries({ id, projectId, page, limit }) {
    const existing = await webhookRepository.findWebhookByIdAndProjectId(id, projectId);
    if (!existing) {
      throw new NotFoundError('Webhook not found');
    }
    return webhookRepository.findDeliveriesByWebhookId(id, { page, limit });
  }

  /**
   * Processes inbound provider webhooks: verifies signature, parses normalized event,
   * deduplicates via providerEventId, updates Notification status, and enqueues customer webhooks.
   */
  async processInboundProviderWebhook({ providerName, rawBody, signature, body, secret = process.env.MOCK_PROVIDER_WEBHOOK_SECRET || 'mock_webhook_secret_dev_key' }) {
    const adapter = this.getProviderAdapter(providerName);

    // 1. Verify HMAC Signature
    adapter.verifySignature(rawBody, signature, secret);

    // 2. Parse & Normalize Event Payload
    const normalized = adapter.normalizeEvent(body);

    // 3. Deduplicate via composite unique index (provider, providerEventId)
    if (normalized.providerEventId) {
      const existingEvent = await webhookRepository.findEventByProviderAndEventId(
        providerName,
        normalized.providerEventId
      );
      if (existingEvent) {
        logger.info(
          { provider: providerName, providerEventId: normalized.providerEventId },
          'Duplicate provider webhook received. Acknowledging safely.'
        );
        return { duplicate: true, event: existingEvent };
      }
    }

    // 4. Find matching Notification in PostgreSQL
    const notification = await prisma.notification.findUnique({
      where: { id: normalized.notificationId },
    });

    if (!notification) {
      logger.warn(
        { notificationId: normalized.notificationId, provider: providerName },
        'Inbound provider event received for non-existent notification.'
      );
      throw new NotFoundError(`Notification ${normalized.notificationId} not found`);
    }

    // 5. Persist normalized Event record
    let event;
    try {
      event = await webhookRepository.createEvent({
        notificationId: notification.id,
        projectId: notification.projectId,
        provider: providerName,
        providerEventId: normalized.providerEventId,
        providerMessageId: normalized.providerMessageId,
        type: normalized.type,
        metadata: normalized.metadata,
        occurredAt: normalized.occurredAt,
      });
    } catch (createErr) {
      if (createErr.code === 'P2002') {
        const existing = await webhookRepository.findEventByProviderAndEventId(
          providerName,
          normalized.providerEventId
        );
        return { duplicate: true, event: existing };
      }
      throw createErr;
    }

    // 6. Update Notification Status
    const statusMap = {
      DELIVERED: 'DELIVERED',
      BOUNCED: 'BOUNCED',
      FAILED: 'FAILED',
      COMPLAINED: 'COMPLAINED',
      SENT: 'SENT',
    };
    const targetStatus = statusMap[normalized.type] || notification.status;

    await notificationRepository.updateStatus(notification.id, {
      status: targetStatus,
    });

    // 7. Dispatch Outbound Customer Webhooks for Project
    await this.dispatchCustomerWebhooksForEvent(event, notification);

    return { duplicate: false, event };
  }

  /**
   * Enqueues outbound customer webhook delivery jobs for a project event.
   */
  async dispatchCustomerWebhooksForEvent(event, notification) {
    const activeWebhooks = await webhookRepository.findActiveWebhooksByProjectId(event.projectId);

    if (activeWebhooks.length === 0) {
      return;
    }

    const eventTypePublic = `notification.${String(event.type).toLowerCase()}`;

    const customerPayload = {
      id: event.id,
      event: eventTypePublic,
      createdAt: event.createdAt.toISOString(),
      data: {
        notificationId: notification.id,
        projectId: notification.projectId,
        channel: notification.channel,
        recipient: notification.recipient,
        status: event.type,
      },
    };

    for (const webhook of activeWebhooks) {
      const delivery = await webhookRepository.createWebhookDelivery({
        webhookId: webhook.id,
        eventId: event.id,
        eventType: eventTypePublic,
        payload: customerPayload,
      });

      try {
        await addWebhookDeliveryJob({ webhookDeliveryId: delivery.id });
      } catch (queueErr) {
        logger.error(
          { webhookDeliveryId: delivery.id, error: queueErr.message },
          'Failed to enqueue customer webhook delivery job'
        );
      }
    }
  }
}

module.exports = new WebhookService();
