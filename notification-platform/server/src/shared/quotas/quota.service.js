const prisma = require('../../config/database');
const { getCurrentBillingPeriod } = require('./usage-period');
const { DEFAULT_PLANS } = require('./quota.constants');
const AppError = require('../errors/app-error');

class QuotaService {
  /**
   * Resolve an organization's active plan and limits (falls back to DEFAULT_PLANS.FREE if unassigned).
   *
   * @param {string} organizationId
   * @returns {Promise<{ plan: Object, limitsMap: Object }>}
   */
  async resolveOrgPlan(organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        plan: {
          include: { limits: true },
        },
      },
    });

    if (!org) {
      throw new AppError('Organization not found', 404);
    }

    let planCode = 'FREE';
    let limitsMap = { ...DEFAULT_PLANS.FREE.limits };

    if (org.plan && org.plan.active) {
      planCode = org.plan.code;
      if (org.plan.limits && org.plan.limits.length > 0) {
        org.plan.limits.forEach((l) => {
          limitsMap[l.metric] = l.limit;
        });
      } else if (DEFAULT_PLANS[planCode]) {
        limitsMap = { ...DEFAULT_PLANS[planCode].limits };
      }
    }

    return {
      organizationId: org.id,
      planCode,
      planName: org.plan?.name || DEFAULT_PLANS.FREE.name,
      limitsMap,
    };
  }

  /**
   * Check metered metric quota (e.g. NOTIFICATIONS, EVENTS) before resource creation.
   *
   * @param {string} organizationId
   * @param {string} metric - NOTIFICATIONS | EVENTS | API_REQUESTS
   * @param {number} [requestedCount=1]
   */
  async checkMeteredQuota(organizationId, metric, requestedCount = 1) {
    const { planCode, planName, limitsMap } = await this.resolveOrgPlan(organizationId);
    const limit = limitsMap[metric] !== undefined ? limitsMap[metric] : DEFAULT_PLANS.FREE.limits[metric] || 1000;

    const { periodStart } = getCurrentBillingPeriod();

    const usageRecord = await prisma.organizationUsage.findUnique({
      where: {
        organizationId_metric_periodStart: {
          organizationId,
          metric,
          periodStart,
        },
      },
    });

    const used = usageRecord ? usageRecord.quantity : 0;
    const remaining = Math.max(0, limit - used);
    const percentage = Math.min(100, Math.round((used / limit) * 100));

    if (used + requestedCount > limit) {
      throw new AppError(
        `Monthly ${metric.toLowerCase()} quota exceeded for plan ${planName}. (Used: ${used}/${limit})`,
        429,
        'QUOTA_EXCEEDED'
      );
    }

    return {
      allowed: true,
      planCode,
      metric,
      used,
      limit,
      remaining,
      percentage,
    };
  }

  /**
   * Check resource count quota (e.g. PROJECTS, API_KEYS, TEMPLATES, WORKFLOWS) before creation.
   *
   * @param {string} organizationId
   * @param {string} metric
   * @param {number} [currentCount] - Optional pre-calculated current count
   */
  async checkResourceQuota(organizationId, metric, currentCount = null) {
    const { planCode, planName, limitsMap } = await this.resolveOrgPlan(organizationId);
    const limit = limitsMap[metric] !== undefined ? limitsMap[metric] : DEFAULT_PLANS.FREE.limits[metric] || 5;

    let used = currentCount;
    if (used === null) {
      if (metric === 'PROJECTS') {
        used = await prisma.project.count({ where: { organizationId } });
      } else if (metric === 'API_KEYS') {
        used = await prisma.apiKey.count({ where: { project: { organizationId } } });
      } else if (metric === 'TEMPLATES') {
        used = await prisma.template.count({ where: { project: { organizationId } } });
      } else if (metric === 'WORKFLOWS') {
        used = await prisma.workflow.count({ where: { project: { organizationId } } });
      } else {
        used = 0;
      }
    }

    if (used >= limit) {
      throw new AppError(
        `Resource quota for ${metric.toLowerCase()} exceeded for plan ${planName}. (Current: ${used}/${limit})`,
        429,
        'QUOTA_EXCEEDED'
      );
    }

    return {
      allowed: true,
      planCode,
      metric,
      used,
      limit,
      remaining: Math.max(0, limit - used),
    };
  }
}

module.exports = new QuotaService();
