const prisma = require('../../config/database');

class PreferenceRepository {
  async findByRecipientId(recipientId) {
    return prisma.recipientPreference.findMany({
      where: { recipientId },
    });
  }

  async upsertPreference(recipientId, category, channel, enabled) {
    return prisma.recipientPreference.upsert({
      where: {
        recipientId_category_channel: {
          recipientId,
          category,
          channel,
        },
      },
      update: {
        enabled,
      },
      create: {
        recipientId,
        category,
        channel,
        enabled,
      },
    });
  }

  async upsertBatch(recipientId, preferencesList = []) {
    return prisma.$transaction(
      preferencesList.map(({ category, channel, enabled }) =>
        prisma.recipientPreference.upsert({
          where: {
            recipientId_category_channel: {
              recipientId,
              category,
              channel,
            },
          },
          update: { enabled },
          create: { recipientId, category, channel, enabled },
        })
      )
    );
  }
}

module.exports = new PreferenceRepository();
