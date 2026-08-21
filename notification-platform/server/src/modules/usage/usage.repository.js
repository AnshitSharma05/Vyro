const prisma = require('../../config/database');
const { getCurrentBillingPeriod } = require('../../shared/quotas/usage-period');

class UsageRepository {
  /**
   * Atomically increment metered usage in PostgreSQL.
   *
   * @param {string} organizationId
   * @param {string} metric
   * @param {number} [amount=1]
   */
  async incrementUsage(organizationId, metric, amount = 1) {
    const { periodStart, periodEnd } = getCurrentBillingPeriod();

    return prisma.organizationUsage.upsert({
      where: {
        organizationId_metric_periodStart: {
          organizationId,
          metric,
          periodStart,
        },
      },
      update: {
        quantity: {
          increment: amount,
        },
      },
      create: {
        organizationId,
        metric,
        periodStart,
        periodEnd,
        quantity: amount,
      },
    });
  }

  async findCurrentUsage(organizationId) {
    const { periodStart } = getCurrentBillingPeriod();

    return prisma.organizationUsage.findMany({
      where: {
        organizationId,
        periodStart,
      },
    });
  }

  async findUsageHistory(organizationId) {
    return prisma.organizationUsage.findMany({
      where: { organizationId },
      orderBy: { periodStart: 'desc' },
    });
  }
}

module.exports = new UsageRepository();
