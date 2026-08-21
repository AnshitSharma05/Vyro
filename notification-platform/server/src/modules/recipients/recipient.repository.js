const prisma = require('../../config/database');

class RecipientRepository {
  async create({ projectId, externalUserId, email, phone }) {
    return prisma.recipient.create({
      data: {
        projectId,
        externalUserId,
        email: email || null,
        phone: phone || null,
      },
    });
  }

  async findByExternalUserId(projectId, externalUserId) {
    return prisma.recipient.findUnique({
      where: {
        projectId_externalUserId: {
          projectId,
          externalUserId,
        },
      },
      include: {
        preferences: true,
        devices: {
          where: { isActive: true },
        },
      },
    });
  }

  async findById(id) {
    return prisma.recipient.findUnique({
      where: { id },
      include: {
        preferences: true,
        devices: {
          where: { isActive: true },
        },
      },
    });
  }

  async update(id, { email, phone }) {
    const data = {};
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;

    return prisma.recipient.update({
      where: { id },
      data,
      include: {
        preferences: true,
        devices: {
          where: { isActive: true },
        },
      },
    });
  }

  async findByProjectId(projectId, { page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;
    const [recipients, total] = await Promise.all([
      prisma.recipient.findMany({
        where: { projectId },
        include: {
          devices: { where: { isActive: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.recipient.count({ where: { projectId } }),
    ]);

    return { recipients, total, page, limit };
  }
}

module.exports = new RecipientRepository();
