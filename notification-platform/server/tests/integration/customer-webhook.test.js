const request = require('supertest');
const app = require('../../src/app');
const organizationRepository = require('../../src/modules/organizations/organization.repository');
const projectRepository = require('../../src/modules/projects/project.repository');
const webhookRepository = require('../../src/modules/webhooks/webhook.repository');
const authRepository = require('../../src/modules/auth/auth.repository');
const jwt = require('../../src/shared/utils/jwt');

describe('CUSTOMER WEBHOOK MANAGEMENT INTEGRATION TESTS (PHASE 12)', () => {
  const userA = {
    id: 'whu10000-0000-0000-0000-000000000001',
    email: 'user_wh_a@example.com',
    name: 'User WH A',
  };

  const userB = {
    id: 'whu10000-0000-0000-0000-000000000002',
    email: 'user_wh_b@example.com',
    name: 'User WH B',
  };

  const orgA = {
    id: 'who20000-0000-0000-0000-000000000001',
    name: 'Organization WH',
    slug: 'org-wh',
  };

  const projectA = {
    id: 'whp30000-0000-0000-0000-000000000001',
    organizationId: orgA.id,
    name: 'Project WH A',
    slug: 'proj-wh-a',
    organization: orgA,
  };

  const tokenUserA = jwt.generateToken({ userId: userA.id, email: userA.email });
  const tokenUserB = jwt.generateToken({ userId: userB.id, email: userB.email });

  const inMemoryWebhooks = [];

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
      return null; // User B is not a member
    });

    jest.spyOn(webhookRepository, 'createWebhook').mockImplementation(async (data) => {
      const wh = {
        id: `wh-${inMemoryWebhooks.length + 1}`,
        projectId: data.projectId,
        url: data.url,
        secret: data.secret,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryWebhooks.push(wh);
      return wh;
    });

    jest.spyOn(webhookRepository, 'findWebhooksByProjectId').mockImplementation(async (projId) => {
      return inMemoryWebhooks
        .filter((w) => w.projectId === projId)
        .map(({ secret, ...safe }) => safe);
    });

    jest.spyOn(webhookRepository, 'findWebhookByIdAndProjectId').mockImplementation(async (id, projId) => {
      return inMemoryWebhooks.find((w) => w.id === id && w.projectId === projId) || null;
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('1. POST /api/v1/projects/:projectId/webhooks creates webhook and returns secret ONCE', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projectA.id}/webhooks`)
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({ url: 'https://client-app.example.com/webhooks' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.webhook.secret).toBeDefined();
    expect(res.body.data.webhook.secret).toContain('whsec_');

    // Subsequent GET list must omit secret
    const resList = await request(app)
      .get(`/api/v1/projects/${projectA.id}/webhooks`)
      .set('Authorization', `Bearer ${tokenUserA}`);

    expect(resList.statusCode).toBe(200);
    expect(resList.body.data.webhooks[0].secret).toBeUndefined();
  });

  it('2. Tenant Isolation: User B cannot access Project A webhooks (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectA.id}/webhooks`)
      .set('Authorization', `Bearer ${tokenUserB}`);

    expect(res.statusCode).toBe(403);
  });
});
