const prisma = require('../../config/database');

class DeviceRepository {
  async upsertDevice({ recipientId, token, platform = 'WEB' }) {
    return prisma.device.upsert({
      where: {
        recipientId_token: {
          recipientId,
          token,
        },
      },
      update: {
        platform,
        isActive: true,
        lastSeenAt: new Date(),
      },
      create: {
        recipientId,
        token,
        platform,
        isActive: true,
        lastSeenAt: new Date(),
      },
    });
  }

  async findActiveByRecipientId(recipientId) {
    return prisma.device.findMany({
      where: {
        recipientId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id) {
    return prisma.device.findUnique({
      where: { id },
    });
  }

  async deactivateDevice(id) {
    return prisma.device.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }

  async deactivateByToken(recipientId, token) {
    return prisma.device.updateMany({
      where: {
        recipientId,
        token,
      },
      data: {
        isActive: false,
      },
    });
  }
}

module.exports = new DeviceRepository();
