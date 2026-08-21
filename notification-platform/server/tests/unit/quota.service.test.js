const quotaService = require('../../src/shared/quotas/quota.service');
const prisma = require('../../src/config/database');
const AppError = require('../../src/shared/errors/app-error');

describe('QuotaService Unit Tests (PHASE 21)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('1. Resolves FREE plan limits by default when organization has no assigned plan', async () => {
    jest.spyOn(prisma.organization, 'findUnique').mockResolvedValue({
      id: 'org_test_1',
      name: 'Org 1',
      planId: null,
      plan: null,
    });

    const result = await quotaService.resolveOrgPlan('org_test_1');
    expect(result.planCode).toBe('FREE');
    expect(result.limitsMap.NOTIFICATIONS).toBe(1000);
  });

  it('2. Throws AppError 429 QUOTA_EXCEEDED when metered usage exceeds plan limit', async () => {
    jest.spyOn(prisma.organization, 'findUnique').mockResolvedValue({
      id: 'org_test_1',
      planId: 'plan_free',
      plan: { code: 'FREE', name: 'Free Plan', active: true, limits: [{ metric: 'NOTIFICATIONS', limit: 1000 }] },
    });

    jest.spyOn(prisma.organizationUsage, 'findUnique').mockResolvedValue({
      quantity: 1000,
    });

    await expect(
      quotaService.checkMeteredQuota('org_test_1', 'NOTIFICATIONS', 1)
    ).rejects.toThrow(AppError);
  });

  it('3. Throws AppError 429 QUOTA_EXCEEDED when resource count exceeds plan limit', async () => {
    jest.spyOn(prisma.organization, 'findUnique').mockResolvedValue({
      id: 'org_test_1',
      planId: 'plan_free',
      plan: { code: 'FREE', name: 'Free Plan', active: true, limits: [{ metric: 'PROJECTS', limit: 2 }] },
    });

    jest.spyOn(prisma.project, 'count').mockResolvedValue(2);

    await expect(
      quotaService.checkResourceQuota('org_test_1', 'PROJECTS')
    ).rejects.toThrow(AppError);
  });
});
