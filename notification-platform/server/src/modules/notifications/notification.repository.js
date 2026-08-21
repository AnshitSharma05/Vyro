const prisma = require('../../config/database');

const MAX_ERROR_MESSAGE_LENGTH = 500;

class NotificationRepository {
  /**
   * Truncates and sanitizes error message string for database storage.
   *
   * @param {string|null} msg
   * @returns {string|null}
   */
  sanitizeErrorMessage(msg) {
    if (!msg || typeof msg !== 'string') return null;
    const trimmed = msg.trim();
    if (trimmed.length > MAX_ERROR_MESSAGE_LENGTH) {
      return `${trimmed.substring(0, MAX_ERROR_MESSAGE_LENGTH - 3)}...`;
    }
    return trimmed;
  }

  async create({ projectId, templateId, channel, recipient, status = 'PENDING', idempotencyKey, requestHash, metadata }) {
    return prisma.notification.create({
      data: {
        projectId,
        templateId: templateId || null,
        channel,
        recipient,
        status,
        idempotencyKey: idempotencyKey || null,
        requestHash: requestHash || null,
        metadata: metadata || null,
      },
    });
  }

  async findByIdempotencyKey(projectId, idempotencyKey) {
    if (!idempotencyKey) return null;
    return prisma.notification.findUnique({
      where: {
        projectId_idempotencyKey: {
          projectId,
          idempotencyKey,
        },
      },
      include: {
        attempts: {
          orderBy: { attemptedAt: 'asc' },
        },
      },
    });
  }

  async createAttempt({ notificationId, provider, status, attemptNumber = 1, errorCode, errorMessage, deliveredAt }) {
    return prisma.notificationAttempt.create({
      data: {
        notificationId,
        provider,
        status,
        attemptNumber: attemptNumber || 1,
        errorCode: errorCode || null,
        errorMessage: this.sanitizeErrorMessage(errorMessage),
        deliveredAt: deliveredAt ? new Date(deliveredAt) : null,
      },
    });
  }

  async getAttemptCount(notificationId) {
    return prisma.notificationAttempt.count({
      where: { notificationId },
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
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (safePage - 1) * safeLimit;
    const where = { projectId };

    if (status) where.status = status;
    if (channel) where.channel = channel;
    if (recipient) where.recipient = { contains: recipient, mode: 'insensitive' };

    const [notifications, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          template: {
            select: {
              id: true,
              name: true,
            },
          },
          attempts: {
            orderBy: { attemptedAt: 'asc' },
          },
        },
      }),
      prisma.notification.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / safeLimit) || 1;

    return {
      items: notifications,
      notifications, // Backward compatibility for existing callers
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: totalCount,
        totalPages,
      },
      totalCount,
      page: safePage,
      limit: safeLimit,
      totalPages,
    };
  }

  async findByIdAndProjectId(id, projectId) {
    const notification = await prisma.notification.findUnique({
      where: { id },
      include: {
        template: {
          select: {
            id: true,
            name: true,
          },
        },
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
