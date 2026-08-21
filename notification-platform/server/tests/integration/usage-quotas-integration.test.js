const request = require('supertest');
const app = require('../../src/app');
const planService = require('../../src/modules/plans/plan.service');
const usageService = require('../../src/modules/usage/usage.service');
const projectRepository = require('../../src/modules/projects/project.repository');
const apiKeyRepository = require('../../src/modules/api-keys/api-key.repository');
const notificationService = require('../../src/modules/notifications/notification.service');
const quotaService = require('../../src/shared/quotas/quota.service');
const { generateApiKey, hashApiKey } = require('../../src/modules/api-keys/api-key.utils');

describe('USAGE METERING & QUOTAS INTEGRATION TESTS (PHASE 21)', () => {
  const projectA = {
    id: 'proj_quota_1000-0000-0000-0000-000000000001',
    organizationId: 'org_quota_1',
    name: 'Quota Project A',
    slug: 'quota-proj-a',
  };

  const { rawKey, keyPrefix } = generateApiKey();
  const apiKeyRecord = {
    id: 'key-quota-all',
    projectId: projectA.id,
    name: 'Quota Key',
    keyPrefix,
    keyHash: hashApiKey(rawKey),
    scopes: ['notifications:send', 'notifications:read', 'usage:read', 'plans:read'],
    revokedAt: null,
    expiresAt: null,
    createdAt: new Date(),
    project: projectA,
  };

  beforeAll(() => {
    jest.spyOn(projectRepository, 'findProjectById').mockResolvedValue(projectA);
    jest.spyOn(apiKeyRepository, 'findByPrefix').mockImplementation(async (prefix) => {
      if (prefix === keyPrefix) return [apiKeyRecord];
      return [];
    });
    jest.spyOn(apiKeyRepository, 'updateLastUsedAt').mockResolvedValue({});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('1. Retrieves subscription plans list via GET /api/v1/plans', async () => {
    jest.spyOn(planService, 'listPlans').mockResolvedValue([
      { code: 'FREE', name: 'Free Plan', active: true, limits: [] },
      { code: 'PRO', name: 'Pro Plan', active: true, limits: [] },
      { code: 'BUSINESS', name: 'Business Plan', active: true, limits: [] },
    ]);

    const res = await request(app).get('/api/v1/plans');

    expect(res.statusCode).toBe(200);
    expect(res.body.data.plans.length).toBe(3);
    expect(res.body.data.plans[0].code).toBe('FREE');
  });

  it('2. Retrieves usage summary via GET /api/v1/usage/summary with X-API-Key', async () => {
    jest.spyOn(usageService, 'getUsageSummary').mockResolvedValue({
      organizationId: projectA.organizationId,
      plan: { code: 'FREE', name: 'Free Plan' },
      period: { key: '2026-08' },
      overQuota: false,
      metrics: {
        NOTIFICATIONS: { used: 450, limit: 1000, remaining: 550, percentage: 45, thresholdState: 'NORMAL' },
      },
    });

    const res = await request(app)
      .get('/api/v1/usage/summary')
      .set('X-API-Key', rawKey);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.plan.code).toBe('FREE');
    expect(res.body.data.metrics.NOTIFICATIONS.used).toBe(450);
  });

  it('3. Rejects notification creation with HTTP 429 QUOTA_EXCEEDED when monthly quota is reached', async () => {
    jest.spyOn(quotaService, 'checkMeteredQuota').mockImplementation(async () => {
      const AppError = require('../../src/shared/errors/app-error');
      throw new AppError('Monthly notifications quota exceeded', 429, 'QUOTA_EXCEEDED');
    });

    const res = await request(app)
      .post('/api/v1/notifications/send')
      .set('X-API-Key', rawKey)
      .send({
        template: 'welcome-email',
        recipient: 'overquota@example.com',
      });

    expect(res.statusCode).toBe(429);
    expect(res.body.error.code).toBe('QUOTA_EXCEEDED');
  });
});
