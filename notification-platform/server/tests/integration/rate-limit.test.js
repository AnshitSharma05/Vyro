const request = require('supertest');
const app = require('../../src/app');
const organizationRepository = require('../../src/modules/organizations/organization.repository');
const projectRepository = require('../../src/modules/projects/project.repository');
const apiKeyRepository = require('../../src/modules/api-keys/api-key.repository');
const templateRepository = require('../../src/modules/templates/template.repository');
const notificationQueue = require('../../src/queues/notification.queue');
const authRepository = require('../../src/modules/auth/auth.repository');
const rateLimitService = require('../../src/shared/rate-limit/rate-limit.service');
const { generateApiKey, hashApiKey } = require('../../src/modules/api-keys/api-key.utils');

describe('RATE LIMITING & ABUSE PROTECTION INTEGRATION TESTS (PHASE 10)', () => {
  const userA = {
    id: 'rl100000-0000-0000-0000-000000000001',
    email: 'user_rl_integ@example.com',
    name: 'User RL Integ',
  };

  const orgA = {
    id: 'rl200000-0000-0000-0000-000000000001',
    name: 'Organization RL Integ',
    slug: 'org-rl-integ',
  };

  const projectA = {
    id: 'rl300000-0000-0000-0000-000000000001',
    organizationId: orgA.id,
    name: 'Project RL A',
    slug: 'proj-rl-a',
    organization: orgA,
  };

  const projectB = {
    id: 'rl300000-0000-0000-0000-000000000002',
    organizationId: orgA.id,
    name: 'Project RL B',
    slug: 'proj-rl-b',
    organization: orgA,
  };

  const { rawKey: rawApiKeyA1, keyPrefix: prefixA1 } = generateApiKey();
  const apiKeyRecordA1 = {
    id: 'key-rl-a1',
    projectId: projectA.id,
    name: 'Key RL A1',
    keyPrefix: prefixA1,
    keyHash: hashApiKey(rawApiKeyA1),
    revokedAt: null,
    expiresAt: null,
    createdAt: new Date(),
    project: projectA,
  };

  const { rawKey: rawApiKeyA2, keyPrefix: prefixA2 } = generateApiKey();
  const apiKeyRecordA2 = {
    id: 'key-rl-a2',
    projectId: projectA.id,
    name: 'Key RL A2',
    keyPrefix: prefixA2,
    keyHash: hashApiKey(rawApiKeyA2),
    revokedAt: null,
    expiresAt: null,
    createdAt: new Date(),
    project: projectA,
  };

  const { rawKey: rawApiKeyB1, keyPrefix: prefixB1 } = generateApiKey();
  const apiKeyRecordB1 = {
    id: 'key-rl-b1',
    projectId: projectB.id,
    name: 'Key RL B1',
    keyPrefix: prefixB1,
    keyHash: hashApiKey(rawApiKeyB1),
    revokedAt: null,
    expiresAt: null,
    createdAt: new Date(),
    project: projectB,
  };

  const templateA = {
    id: 'tpl-rl-a',
    projectId: projectA.id,
    name: 'welcome-alert',
    channel: 'EMAIL',
    subject: 'Welcome {{name}}',
    body: 'Hello {{name}}.',
  };

  const templateB = {
    id: 'tpl-rl-b',
    projectId: projectB.id,
    name: 'welcome-alert',
    channel: 'EMAIL',
    subject: 'Welcome {{name}}',
    body: 'Hello {{name}}.',
  };

  beforeAll(() => {
    jest.spyOn(authRepository, 'findById').mockResolvedValue(userA);
    jest.spyOn(organizationRepository, 'findMembership').mockResolvedValue({ role: 'OWNER' });
    jest.spyOn(projectRepository, 'findProjectById').mockImplementation(async (id) => {
      if (id === projectA.id) return projectA;
      if (id === projectB.id) return projectB;
      return null;
    });

    jest.spyOn(apiKeyRepository, 'findByPrefix').mockImplementation(async (prefix) => {
      if (prefix === prefixA1) return [apiKeyRecordA1];
      if (prefix === prefixA2) return [apiKeyRecordA2];
      if (prefix === prefixB1) return [apiKeyRecordB1];
      return [];
    });
    jest.spyOn(apiKeyRepository, 'updateLastUsedAt').mockResolvedValue({});

    jest.spyOn(templateRepository, 'findByNameAndProjectId').mockImplementation(async (name, projId) => {
      if (name === 'welcome-alert' && projId === projectA.id) return templateA;
      if (name === 'welcome-alert' && projId === projectB.id) return templateB;
      return null;
    });

    jest.spyOn(notificationQueue, 'addNotificationJob').mockResolvedValue({ id: 'job-mock-rl' });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('1. Multi-project isolation: Project A quota exhaustion returns 429 while Project B remains allowed', async () => {
    // Mock rate limit counters in-memory per project key
    const projectCounters = {};

    jest.spyOn(rateLimitService, 'checkAndIncrementRateLimit').mockImplementation(async ({ key, limit }) => {
      projectCounters[key] = (projectCounters[key] || 0) + 1;
      const count = projectCounters[key];
      const allowed = count <= limit;
      return {
        total: count,
        limit,
        remaining: Math.max(0, limit - count),
        resetSeconds: 60,
        resetTimestamp: Math.floor(Date.now() / 1000) + 60,
        allowed,
      };
    });

    // Project A sends requests up to limit (Limit = 3)
    const limit = 3;
    const config = require('../../src/config/env');
    const origLimit = config.NOTIFICATION_RATE_LIMIT;
    config.NOTIFICATION_RATE_LIMIT = limit;

    for (let i = 1; i <= limit; i++) {
      const res = await request(app)
        .post('/api/v1/notifications/send')
        .set('X-API-Key', rawApiKeyA1)
        .send({ template: 'welcome-alert', recipient: 'rl_a@example.com' });
      expect(res.statusCode).toBe(202);
    }

    // 4th Request for Project A must return HTTP 429 Too Many Requests
    const resA4 = await request(app)
      .post('/api/v1/notifications/send')
      .set('X-API-Key', rawApiKeyA1)
      .send({ template: 'welcome-alert', recipient: 'rl_a@example.com' });

    expect(resA4.statusCode).toBe(429);
    expect(resA4.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(resA4.headers['retry-after']).toBeDefined();
    expect(resA4.headers['x-ratelimit-remaining']).toBe('0');

    // Project B sends request - should be ALLOWED (202 Accepted)
    const resB1 = await request(app)
      .post('/api/v1/notifications/send')
      .set('X-API-Key', rawApiKeyB1)
      .send({ template: 'welcome-alert', recipient: 'rl_b@example.com' });

    expect(resB1.statusCode).toBe(202);

    config.NOTIFICATION_RATE_LIMIT = origLimit;
  });

  it('2. API Key rotation preserves project quota (Key A2 inherits Project A rate limit state)', async () => {
    // Send request with newly rotated API Key A2 for Project A -> Must still be rate limited (429)
    const resA2 = await request(app)
      .post('/api/v1/notifications/send')
      .set('X-API-Key', rawApiKeyA2)
      .send({ template: 'welcome-alert', recipient: 'rl_a@example.com' });

    expect(resA2.statusCode).toBe(429);
    expect(resA2.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('3. Fail-closed: Redis failure returns HTTP 503 Service Unavailable', async () => {
    jest.spyOn(rateLimitService, 'checkAndIncrementRateLimit').mockResolvedValueOnce({
      allowed: false,
      error: true,
      limit: 100,
      remaining: 0,
      resetSeconds: 60,
      resetTimestamp: Math.floor(Date.now() / 1000) + 60,
    });

    const res = await request(app)
      .post('/api/v1/notifications/send')
      .set('X-API-Key', rawApiKeyA1)
      .send({ template: 'welcome-alert', recipient: 'fail_closed@example.com' });

    expect(res.statusCode).toBe(503);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });
});
