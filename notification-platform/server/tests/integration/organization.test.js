const request = require('supertest');
const app = require('../../src/app');
const organizationRepository = require('../../src/modules/organizations/organization.repository');
const { signToken } = require('../../src/shared/utils/jwt');

describe('Organization API Integration Tests', () => {
  const userA = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'usera@example.com',
    name: 'User A',
  };

  const userB = {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'userb@example.com',
    name: 'User B',
  };

  const tokenUserA = signToken({ sub: userA.id, email: userA.email });
  const tokenUserB = signToken({ sub: userB.id, email: userB.email });

  let orgAId = '';

  beforeAll(() => {
    const orgsDb = new Map();
    const membersDb = [];

    const authRepository = require('../../src/modules/auth/auth.repository');
    jest.spyOn(authRepository, 'findById').mockImplementation(async (id) => {
      if (id === userA.id) return userA;
      if (id === userB.id) return userB;
      return null;
    });

    jest.spyOn(organizationRepository, 'createWithMember').mockImplementation(async ({ name, slug, userId }) => {
      const org = {
        id: '99999999-9999-9999-9999-999999999999',
        name,
        slug,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      orgsDb.set(org.id, org);
      membersDb.push({
        id: 'mem-11111111-1111-1111-1111-111111111111',
        organizationId: org.id,
        userId,
        role: 'OWNER',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return org;
    });

    jest.spyOn(organizationRepository, 'findBySlug').mockImplementation(async (slug) => {
      for (const org of orgsDb.values()) {
        if (org.slug === slug) return org;
      }
      return null;
    });

    jest.spyOn(organizationRepository, 'findById').mockImplementation(async (id) => {
      return orgsDb.get(id) || null;
    });

    jest.spyOn(organizationRepository, 'findUserOrganizations').mockImplementation(async (userId) => {
      const userMems = membersDb.filter((m) => m.userId === userId);
      return userMems.map((m) => ({
        ...orgsDb.get(m.organizationId),
        role: m.role,
        joinedAt: m.createdAt,
      }));
    });

    jest.spyOn(organizationRepository, 'findMembership').mockImplementation(async (organizationId, userId) => {
      return membersDb.find((m) => m.organizationId === organizationId && m.userId === userId) || null;
    });

    jest.spyOn(organizationRepository, 'findMembers').mockImplementation(async (organizationId) => {
      const orgMems = membersDb.filter((m) => m.organizationId === organizationId);
      return orgMems.map((m) => ({
        ...m,
        user: m.userId === userA.id ? userA : userB,
      }));
    });

    jest.spyOn(organizationRepository, 'update').mockImplementation(async (id, data) => {
      const org = orgsDb.get(id);
      if (!org) return null;
      const updated = { ...org, ...data, updatedAt: new Date() };
      orgsDb.set(id, updated);
      return updated;
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/v1/organizations', () => {
    it('should allow authenticated user to create an organization (201 Created)', async () => {
      const res = await request(app)
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ name: 'Acme Corporation' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Acme Corporation');
      expect(res.body.data.slug).toBe('acme-corporation');

      orgAId = res.body.data.id;
    });

    it('should reject organization creation for unauthenticated user (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/v1/organizations')
        .send({ name: 'Unauthorized Corp' });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/organizations', () => {
    it('should list organizations belonging to authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/organizations')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.organizations.length).toBe(1);
      expect(res.body.data.organizations[0].id).toBe(orgAId);
    });

    it('should return empty list for user without memberships', async () => {
      const res = await request(app)
        .get('/api/v1/organizations')
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.organizations.length).toBe(0);
    });
  });

  describe('GET /api/v1/organizations/:organizationId', () => {
    it('should return organization details for member', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.organization.name).toBe('Acme Corporation');
      expect(res.body.data.organization.userRole).toBe('OWNER');
    });

    it('should reject access for non-member user (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}`)
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
