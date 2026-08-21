const prisma = require('../../config/database');

class WebhookRepository {
  async createWebhook({ projectId, url, secret }) {
    return prisma.webhook.create({
      data: {
        projectId,
        url,
        secret,
        active: true,
      },
    });
  }

  async findWebhooksByProjectId(projectId) {
    return prisma.webhook.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        projectId: true,
        url: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findActiveWebhooksByProjectId(projectId) {
    return prisma.webhook.findMany({
      where: { projectId, active: true },
    });
  }

  async findWebhookByIdAndProjectId(id, projectId) {
    return prisma.webhook.findFirst({
      where: { id, projectId },
    });
  }

  async updateWebhook(id, projectId, { url, active }) {
    const dataToUpdate = {};
    if (url !== undefined) dataToUpdate.url = url;
    if (active !== undefined) dataToUpdate.active = active;

    return prisma.webhook.updateMany({
      where: { id, projectId },
      data: dataToUpdate,
    });
  }

  async deleteWebhook(id, projectId) {
    return prisma.webhook.deleteMany({
      where: { id, projectId },
    });
  }

  async createEvent({ notificationId, projectId, provider, providerEventId, providerMessageId, type, metadata, occurredAt }) {
    return prisma.event.create({
      data: {
        notificationId: notificationId || null,
        projectId,
        provider,
        providerEventId: providerEventId || null,
        providerMessageId: providerMessageId || null,
        type,
        metadata: metadata || null,
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      },
    });
  }

  async findEventByProviderAndEventId(provider, providerEventId) {
    if (!providerEventId) return null;
    return prisma.event.findUnique({
      where: {
        provider_providerEventId: {
          provider,
          providerEventId,
        },
      },
    });
  }

  async createWebhookDelivery({ webhookId, eventId, eventType, payload }) {
    return prisma.webhookDelivery.create({
      data: {
        webhookId,
        eventId: eventId || null,
        eventType,
        payload,
        status: 'PENDING',
      },
    });
  }

  async findDeliveriesByWebhookId(webhookId, { page = 1, limit = 20 }) {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (safePage - 1) * safeLimit;

    const [deliveries, totalCount] = await Promise.all([
      prisma.webhookDelivery.findMany({
        where: { webhookId },
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.webhookDelivery.count({ where: { webhookId } }),
    ]);

    const totalPages = Math.ceil(totalCount / safeLimit) || 1;

    return {
      deliveries,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: totalCount,
        totalPages,
      },
    };
  }
}

module.exports = new WebhookRepository();
