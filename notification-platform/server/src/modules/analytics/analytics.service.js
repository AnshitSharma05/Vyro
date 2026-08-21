const analyticsRepository = require('./analytics.repository');
const ValidationError = require('../../shared/errors/validation-error');

class AnalyticsService {
  /**
   * Helper to resolve start and end UTC Date objects from range string or custom inputs.
   */
  parseDateRange({ range = '7d', startDate: customStart, endDate: customEnd }) {
    const now = new Date();
    let endDate = new Date(now);
    let startDate;

    if (range === 'today') {
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    } else if (range === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === '30d') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (range === 'this_month') {
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    } else if (range === 'custom') {
      if (!customStart || !customEnd) {
        throw new ValidationError('Both startDate and endDate are required for custom date range');
      }
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new ValidationError('Invalid date format for custom range');
      }
      if (startDate > endDate) {
        throw new ValidationError('startDate cannot be after endDate');
      }
      const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 365) {
        throw new ValidationError('Requested date range cannot exceed 365 days');
      }
    } else {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }

  /**
   * Calculate Overview Metrics & Timeline.
   */
  async getOverviewAnalytics({ projectId, range, startDate: customStart, endDate: customEnd }) {
    const { startDate, endDate } = this.parseDateRange({ range, startDate: customStart, endDate: customEnd });

    const [statusGroups, latencyStats, timelineNotifs] = await Promise.all([
      analyticsRepository.getStatusGroupCounts({ projectId, startDate, endDate }),
      analyticsRepository.getDeliveryLatencyStats({ projectId, startDate, endDate }),
      analyticsRepository.getTimelineNotifications({ projectId, startDate, endDate }),
    ]);

    let totalNotifications = 0;
    let sent = 0;
    let delivered = 0;
    let failed = 0;
    let bounced = 0;

    statusGroups.forEach((group) => {
      const count = group._count._all;
      totalNotifications += count;
      if (group.status === 'SENT' || group.status === 'DELIVERED') {
        sent += count;
      }
      if (group.status === 'DELIVERED') {
        delivered += count;
      }
      if (group.status === 'FAILED') {
        failed += count;
      }
      if (group.status === 'BOUNCED') {
        bounced += count;
      }
    });

    const deliveryRate = sent > 0 ? Number(((delivered / sent) * 100).toFixed(2)) : 0;
    const failureRate = totalNotifications > 0 ? Number(((failed / totalNotifications) * 100).toFixed(2)) : 0;

    // Build continuous daily time-series timeline padding zero-count days
    const timelineMap = {};
    const curr = new Date(startDate);
    while (curr <= endDate) {
      const dateStr = curr.toISOString().split('T')[0];
      timelineMap[dateStr] = { date: dateStr, total: 0, sent: 0, delivered: 0, failed: 0, bounced: 0 };
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    timelineNotifs.forEach((n) => {
      const dateStr = n.createdAt.toISOString().split('T')[0];
      if (timelineMap[dateStr]) {
        timelineMap[dateStr].total += 1;
        if (n.status === 'SENT' || n.status === 'DELIVERED') timelineMap[dateStr].sent += 1;
        if (n.status === 'DELIVERED') timelineMap[dateStr].delivered += 1;
        if (n.status === 'FAILED') timelineMap[dateStr].failed += 1;
        if (n.status === 'BOUNCED') timelineMap[dateStr].bounced += 1;
      }
    });

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalNotifications,
        sent,
        delivered,
        failed,
        bounced,
        deliveryRate,
        failureRate,
        averageDeliveryLatencyMs: latencyStats.averageLatencyMs,
      },
      timeline: Object.values(timelineMap),
    };
  }

  /**
   * Channel breakdown distribution.
   */
  async getChannelAnalytics({ projectId, range, startDate: customStart, endDate: customEnd }) {
    const { startDate, endDate } = this.parseDateRange({ range, startDate: customStart, endDate: customEnd });
    const channelGroups = await analyticsRepository.getChannelGroupCounts({ projectId, startDate, endDate });

    const channels = {
      EMAIL: { total: 0, sent: 0, delivered: 0, failed: 0 },
      SMS: { total: 0, sent: 0, delivered: 0, failed: 0 },
      WHATSAPP: { total: 0, sent: 0, delivered: 0, failed: 0 },
      PUSH: { total: 0, sent: 0, delivered: 0, failed: 0 },
    };

    channelGroups.forEach((g) => {
      if (channels[g.channel]) {
        const count = g._count._all;
        channels[g.channel].total += count;
        if (g.status === 'SENT' || g.status === 'DELIVERED') channels[g.channel].sent += count;
        if (g.status === 'DELIVERED') channels[g.channel].delivered += count;
        if (g.status === 'FAILED') channels[g.channel].failed += count;
      }
    });

    return { channels };
  }

  async getOrganizationAnalytics({ organizationId, range, startDate: customStart, endDate: customEnd }) {
    const { startDate, endDate } = this.parseDateRange({ range, startDate: customStart, endDate: customEnd });
    return analyticsRepository.getOrganizationUsageTotals({ organizationId, startDate, endDate });
  }

  /**
   * Record usage event helper for atomic counters.
   */
  async recordUsageEvent({ projectId, date = new Date(), channel, counterField }) {
    if (!projectId || !channel || !counterField) return;
    await analyticsRepository.incrementUsageCounter({
      projectId,
      date,
      channel,
      counterField,
    });
  }
}

module.exports = new AnalyticsService();
