const prisma = require('../../config/database');

class AnalyticsRepository {
  /**
   * Atomically increment a usage counter in UsageRecord table via Prisma upsert.
   */
  async incrementUsageCounter({ projectId, date, channel, counterField }) {
    // Normalize date to UTC midnight
    const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

    try {
      return await prisma.usageRecord.upsert({
        where: {
          projectId_date_channel: {
            projectId,
            date: utcDate,
            channel,
          },
        },
        update: {
          [counterField]: { increment: 1 },
        },
        create: {
          projectId,
          date: utcDate,
          channel,
          [counterField]: 1,
        },
      });
    } catch (err) {
      // Non-blocking catch for concurrency edge-cases
      return null;
    }
  }

  /**
   * Get raw status group counts from Notification source-of-truth table.
   */
  async getStatusGroupCounts({ projectId, startDate, endDate }) {
    return prisma.notification.groupBy({
      by: ['status'],
      where: {
        projectId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        _all: true,
      },
    });
  }

  /**
   * Get channel breakdown counts from Notification table.
   */
  async getChannelGroupCounts({ projectId, startDate, endDate }) {
    return prisma.notification.groupBy({
      by: ['channel', 'status'],
      where: {
        projectId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        _all: true,
      },
    });
  }

  /**
   * Get daily aggregated usage records.
   */
  async getUsageRecords({ projectId, startDate, endDate }) {
    return prisma.usageRecord.findMany({
      where: {
        projectId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  /**
   * Get notifications for timeline calculations.
   */
  async getTimelineNotifications({ projectId, startDate, endDate }) {
    return prisma.notification.findMany({
      where: {
        projectId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        channel: true,
        status: true,
        createdAt: true,
        sentAt: true,
        failedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Calculate average delivery latency for delivered notifications.
   */
  async getDeliveryLatencyStats({ projectId, startDate, endDate }) {
    const deliveredNotifications = await prisma.notification.findMany({
      where: {
        projectId,
        status: 'DELIVERED',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        sentAt: {
          not: null,
        },
      },
      select: {
        createdAt: true,
        sentAt: true,
      },
    });

    if (deliveredNotifications.length === 0) {
      return { count: 0, averageLatencyMs: 0 };
    }

    const totalMs = deliveredNotifications.reduce((acc, notif) => {
      const diff = new Date(notif.sentAt).getTime() - new Date(notif.createdAt).getTime();
      return acc + (diff > 0 ? diff : 0);
    }, 0);

    return {
      count: deliveredNotifications.length,
      averageLatencyMs: Math.round(totalMs / deliveredNotifications.length),
    };
  }

  /**
   * Aggregate totals across all projects owned by an organization.
   */
  async getOrganizationUsageTotals({ organizationId, startDate, endDate }) {
    const projects = await prisma.project.findMany({
      where: { organizationId },
      select: { id: true, name: true },
    });

    const projectIds = projects.map((p) => p.id);
    if (projectIds.length === 0) {
      return { projects: [], totalNotifications: 0 };
    }

    const groupCounts = await prisma.notification.groupBy({
      by: ['projectId', 'status'],
      where: {
        projectId: { in: projectIds },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        _all: true,
      },
    });

    const projectStatsMap = {};
    projects.forEach((p) => {
      projectStatsMap[p.id] = { id: p.id, name: p.name, total: 0, delivered: 0, failed: 0 };
    });

    groupCounts.forEach((group) => {
      const stat = projectStatsMap[group.projectId];
      if (stat) {
        const count = group._count._all;
        stat.total += count;
        if (group.status === 'DELIVERED') stat.delivered += count;
        if (group.status === 'FAILED') stat.failed += count;
      }
    });

    return {
      projects: Object.values(projectStatsMap),
      totalNotifications: Object.values(projectStatsMap).reduce((sum, p) => sum + p.total, 0),
    };
  }
}

module.exports = new AnalyticsRepository();
