const usageRepository = require('./usage.repository');
const quotaService = require('../../shared/quotas/quota.service');
const { getCurrentBillingPeriod } = require('../../shared/quotas/usage-period');
const prisma = require('../../config/database');

class UsageService {
  async recordUsage(organizationId, metric, amount = 1) {
    return usageRepository.incrementUsage(organizationId, metric, amount);
  }

  async getUsageSummary(organizationId) {
    const { planCode, planName, limitsMap } = await quotaService.resolveOrgPlan(organizationId);
    const { periodStart, periodEnd, periodKey } = getCurrentBillingPeriod();

    const meteredRecords = await usageRepository.findCurrentUsage(organizationId);
    const meteredMap = {};
    meteredRecords.forEach((r) => {
      meteredMap[r.metric] = r.quantity;
    });

    const [projectsCount, apiKeysCount, templatesCount, workflowsCount] = await Promise.all([
      prisma.project.count({ where: { organizationId } }),
      prisma.apiKey.count({ where: { project: { organizationId } } }),
      prisma.template.count({ where: { project: { organizationId } } }),
      prisma.workflow.count({ where: { project: { organizationId } } }),
    ]);

    const resourceCountsMap = {
      PROJECTS: projectsCount,
      API_KEYS: apiKeysCount,
      TEMPLATES: templatesCount,
      WORKFLOWS: workflowsCount,
    };

    const metricsSummary = {};
    let isOverQuota = false;

    for (const [metric, limit] of Object.entries(limitsMap)) {
      let used = 0;
      if (meteredMap[metric] !== undefined) {
        used = meteredMap[metric];
      } else if (resourceCountsMap[metric] !== undefined) {
        used = resourceCountsMap[metric];
      }

      const remaining = Math.max(0, limit - used);
      const percentage = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

      let thresholdState = 'NORMAL';
      if (used >= limit) {
        thresholdState = 'BLOCKED';
        isOverQuota = true;
      } else if (percentage >= 90) {
        thresholdState = 'CRITICAL';
      } else if (percentage >= 80) {
        thresholdState = 'WARNING';
      }

      metricsSummary[metric] = {
        used,
        limit,
        remaining,
        percentage,
        thresholdState,
      };
    }

    return {
      organizationId,
      plan: {
        code: planCode,
        name: planName,
      },
      period: {
        key: periodKey,
        start: periodStart,
        end: periodEnd,
      },
      overQuota: isOverQuota,
      metrics: metricsSummary,
    };
  }

  async getUsageHistory(organizationId) {
    return usageRepository.findUsageHistory(organizationId);
  }
}

module.exports = new UsageService();
