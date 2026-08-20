const prisma = require('../../config/database');

class NotificationRepository {
  async create({ projectId, templateId, channel, recipient, status = 'PENDING', metadata }) {
    return prisma.notification.create({
      data: {
        projectId,
        templateId: templateId || null,
        channel,
        recipient,
        status,
        metadata: metadata || null,
      },
    });
  }

  async createAttempt({ notificationId, provider, status, errorCode, errorMessage, deliveredAt }) {
    return prisma.notificationAttempt.create({
      data: {
        notificationId,
        provider,
        status,
        errorCode: errorCode || null,
        errorMessage: errorMessage || null,
        deliveredAt: deliveredAt ? new Date(deliveredAt) : null,
      },
    });
  }

  async updateStatus(id, { status, sentAt, failedAt, metadata }) {
    const dataToUpdate = { status };
    if (sentAt) dataToUpdate.sentAt = new Date(sentAt);
    if (failedAt) dataToUpdate.failedAt = new Date(failedAt);
    if (metadata !== undefined) dataToUpdate.metadata = metadata;

    return prisma.notification.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async findManyByProjectId({ projectId, page = 1, limit = 20, status, channel, recipient }) {
    const skip = (page - 1) * limit;
    const where = { projectId };

    if (status) where.status = status;
    if (channel) where.channel = channel;
    if (recipient) where.recipient = { contains: recipient, mode: 'insensitive' };

    const [notifications, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          attempts: {
            orderBy: { attemptedAt: 'asc' },
          },
        },
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    };
  }

  async findByIdAndProjectId(id, projectId) {
    const notification = await prisma.notification.findUnique({
      where: { id },
      include: {
        attempts: {
          orderBy: { attemptedAt: 'asc' },
        },
      },
    });

    if (!notification || notification.projectId !== projectId) {
      return null;
    }

    return notification;
  }
}

module.exports = new NotificationRepository();
