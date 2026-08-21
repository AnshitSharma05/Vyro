const request = require('supertest');
const app = require('../../src/app');
const organizationRepository = require('../../src/modules/organizations/organization.repository');
const projectRepository = require('../../src/modules/projects/project.repository');
const analyticsRepository = require('../../src/modules/analytics/analytics.repository');
const authRepository = require('../../src/modules/auth/auth.repository');
const jwt = require('../../src/shared/utils/jwt');

describe('ANALYTICS INTEGRATION TESTS (PHASE 13)', () => {
  const userA = {
    id: 'ana10000-0000-0000-0000-000000000001',
    email: 'user_ana_a@example.com',
    name: 'User ANA A',
  };

  const userB = {
    id: 'ana10000-0000-0000-0000-000000000002',
    email: 'user_ana_b@example.com',
    name: 'User ANA B',
  };

  const orgA = {
    id: 'ano20000-0000-0000-0000-000000000001',
    name: 'Organization ANA',
    slug: 'org-ana',
  };

  const projectA = {
    id: 'anp30000-0000-0000-0000-000000000001',
    organizationId: orgA.id,
    name: 'Project ANA A',
    slug: 'proj-ana-a',
    organization: orgA,
  };

  const tokenUserA = jwt.generateToken({ userId: userA.id, email: userA.email });
  const tokenUserB = jwt.generateToken({ userId: userB.id, email: userB.email });

  beforeAll(() => {
    jest.spyOn(authRepository, 'findById').mockImplementation(async (id) => {
      if (id === userA.id) return userA;
      if (id === userB.id) return userB;
      return null;
    });

    jest.spyOn(projectRepository, 'findProjectById').mockImplementation(async (id) => {
      if (id === projectA.id) return projectA;
      return null;
    });

    jest.spyOn(organizationRepository, 'findMembership').mockImplementation(async (orgId, userId) => {
      if (orgId === orgA.id && userId === userA.id) return { role: 'OWNER' };
      return null; // User B not a member
    });

    jest.spyOn(analyticsRepository, 'getStatusGroupCounts').mockResolvedValue([
      { status: 'SENT', _count: { _all: 5 } },
      { status: 'DELIVERED', _count: { _all: 20 } },
      { status: 'FAILED', _count: { _all: 2 } },
    ]);

    jest.spyOn(analyticsRepository, 'getDeliveryLatencyStats').mockResolvedValue({
      count: 20,
      averageLatencyMs: 450,
    });

    jest.spyOn(analyticsRepository, 'getTimelineNotifications').mockResolvedValue([
      { id: 'n1', channel: 'EMAIL', status: 'DELIVERED', createdAt: new Date(), sentAt: new Date() },
    ]);

    jest.spyOn(analyticsRepository, 'getChannelGroupCounts').mockResolvedValue([
      { channel: 'EMAIL', status: 'DELIVERED', _count: { _all: 15 } },
      { channel: 'SMS', status: 'SENT', _count: { _all: 10 } },
    ]);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('1. GET /api/v1/analytics/overview returns summary stats and timeline', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .query({ projectId: projectA.id, range: '7d' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.summary.totalNotifications).toBe(27);
    expect(res.body.data.summary.delivered).toBe(20);
    expect(res.body.data.summary.deliveryRate).toBe(80); // (20 / 25) * 100
    expect(res.body.data.summary.averageDeliveryLatencyMs).toBe(450);
    expect(res.body.data.timeline).toBeDefined();
    expect(Array.isArray(res.body.data.timeline)).toBe(true);
  });

  it('2. GET /api/v1/analytics/channels returns channel breakdowns', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/channels')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .query({ projectId: projectA.id, range: '7d' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.channels.EMAIL.delivered).toBe(15);
    expect(res.body.data.channels.SMS.sent).toBe(10);
  });

  it('3. Tenant Isolation: User B cannot access Project A analytics (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .query({ projectId: projectA.id });

    expect(res.statusCode).toBe(403);
  });

  it('4. Custom date range > 365 days returns HTTP 400 Bad Request', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .query({
        projectId: projectA.id,
        range: 'custom',
        startDate: '2024-01-01',
        endDate: '2025-06-01',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toContain('365 days');
  });
});
