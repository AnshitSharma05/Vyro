const prisma = require('../../config/database');

class WorkflowRepository {
  async create({ projectId, name, description, eventName, status = 'ACTIVE', actions = [] }) {
    return prisma.workflow.create({
      data: {
        projectId,
        name,
        description: description || null,
        eventName,
        status,
        actions: {
          create: actions.map((action, index) => ({
            order: action.order || index + 1,
            channel: action.channel,
            category: action.category || 'TRANSACTIONAL',
            templateName: action.templateName || action.template,
            delaySeconds: action.delaySeconds || 0,
          })),
        },
      },
      include: {
        actions: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async findByNameAndProjectId(projectId, name) {
    return prisma.workflow.findUnique({
      where: {
        projectId_name: {
          projectId,
          name,
        },
      },
      include: {
        actions: { orderBy: { order: 'asc' } },
      },
    });
  }

  async findByIdAndProjectId(id, projectId) {
    return prisma.workflow.findFirst({
      where: { id, projectId },
      include: {
        actions: { orderBy: { order: 'asc' } },
      },
    });
  }

  async findActiveByEventName(projectId, eventName) {
    return prisma.workflow.findMany({
      where: {
        projectId,
        eventName,
        status: 'ACTIVE',
      },
      include: {
        actions: { orderBy: { order: 'asc' } },
      },
    });
  }

  async findByProjectId(projectId, { page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;
    const [workflows, total] = await Promise.all([
      prisma.workflow.findMany({
        where: { projectId },
        include: {
          actions: { orderBy: { order: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.workflow.count({ where: { projectId } }),
    ]);

    return { workflows, total, page, limit };
  }

  async update(id, { name, description, status, eventName, actions }) {
    return prisma.$transaction(async (tx) => {
      const data = {};
      if (name !== undefined) data.name = name;
      if (description !== undefined) data.description = description;
      if (status !== undefined) data.status = status;
      if (eventName !== undefined) data.eventName = eventName;

      if (actions && Array.isArray(actions)) {
        await tx.workflowAction.deleteMany({ where: { workflowId: id } });
        data.actions = {
          create: actions.map((action, index) => ({
            order: action.order || index + 1,
            channel: action.channel,
            category: action.category || 'TRANSACTIONAL',
            templateName: action.templateName || action.template,
            delaySeconds: action.delaySeconds || 0,
          })),
        };
      }

      return tx.workflow.update({
        where: { id },
        data,
        include: {
          actions: { orderBy: { order: 'asc' } },
        },
      });
    });
  }

  async delete(id) {
    return prisma.workflow.delete({
      where: { id },
    });
  }

  async createExecution({ workflowId, eventId }) {
    return prisma.workflowExecution.create({
      data: {
        workflowId,
        eventId,
        status: 'PROCESSING',
      },
    });
  }

  async createActionExecution({ workflowExecutionId, workflowActionId, notificationId, status = 'COMPLETED', scheduledAt }) {
    return prisma.workflowActionExecution.create({
      data: {
        workflowExecutionId,
        workflowActionId,
        notificationId: notificationId || null,
        status,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        executedAt: new Date(),
      },
    });
  }

  async updateExecutionStatus(id, { status, error }) {
    return prisma.workflowExecution.update({
      where: { id },
      data: {
        status,
        completedAt: new Date(),
        error: error || null,
      },
    });
  }
}

module.exports = new WorkflowRepository();
