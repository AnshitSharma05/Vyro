const prisma = require('../../config/database');

class EventRepository {
  async create({ projectId, eventName, externalEventId, recipient, payload }) {
    return prisma.eventLog.create({
      data: {
        projectId,
        eventName,
        externalEventId,
        recipient,
        payload: payload || {},
        status: 'PENDING',
      },
    });
  }

  async findByExternalEventId(projectId, externalEventId) {
    return prisma.eventLog.findUnique({
      where: {
        projectId_externalEventId: {
          projectId,
          externalEventId,
        },
      },
    });
  }

  async findById(id) {
    return prisma.eventLog.findUnique({
      where: { id },
      include: {
        executions: {
          include: {
            actions: true,
          },
        },
      },
    });
  }

  async updateStatus(id, status) {
    return prisma.eventLog.update({
      where: { id },
      data: { status },
    });
  }

  async findByProjectId(projectId, { page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
      prisma.eventLog.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.eventLog.count({ where: { projectId } }),
    ]);

    return { events, total, page, limit };
  }
}

module.exports = new EventRepository();
