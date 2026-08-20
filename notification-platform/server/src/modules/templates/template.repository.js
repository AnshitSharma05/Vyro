const prisma = require('../../config/database');

class TemplateRepository {
  async create({ projectId, name, channel, subject, body }) {
    return prisma.template.create({
      data: {
        projectId,
        name,
        channel,
        subject: channel === 'EMAIL' ? subject : null,
        body,
      },
    });
  }

  async findManyByProjectId({ projectId, page = 1, limit = 20, channel }) {
    const skip = (page - 1) * limit;
    const where = { projectId };

    if (channel) {
      where.channel = channel;
    }

    const [templates, totalCount] = await Promise.all([
      prisma.template.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.template.count({ where }),
    ]);

    return {
      templates,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    };
  }

  async findByIdAndProjectId(id, projectId) {
    const template = await prisma.template.findUnique({
      where: { id },
    });

    if (!template || template.projectId !== projectId) {
      return null;
    }

    return template;
  }

  async findByNameAndProjectId(name, projectId) {
    return prisma.template.findUnique({
      where: {
        projectId_name: {
          projectId,
          name,
        },
      },
    });
  }

  async update(id, data) {
    return prisma.template.update({
      where: { id },
      data,
    });
  }

  async delete(id) {
    return prisma.template.delete({
      where: { id },
    });
  }
}

module.exports = new TemplateRepository();
