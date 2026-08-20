const request = require('supertest');
const app = require('../../src/app');
const organizationRepository = require('../../src/modules/organizations/organization.repository');
const projectRepository = require('../../src/modules/projects/project.repository');
const authRepository = require('../../src/modules/auth/auth.repository');
const { signToken } = require('../../src/shared/utils/jwt');

describe('CRITICAL MULTI-TENANT ISOLATION TESTS', () => {
  const userA = {
    id: '10000000-0000-0000-0000-000000000001',
    email: 'usera_tenant@example.com',
    name: 'User Tenant A',
  };

  const userB = {
    id: '10000000-0000-0000-0000-000000000002',
    email: 'userb_tenant@example.com',
    name: 'User Tenant B',
  };

  const tokenUserA = signToken({ sub: userA.id, email: userA.email });
  const tokenUserB = signToken({ sub: userB.id, email: userB.email });

  const orgA = {
    id: '20000000-0000-0000-0000-000000000001',
    name: 'Organization A',
    slug: 'organization-a',
  };

  const orgB = {
    id: '20000000-0000-0000-0000-000000000002',
    name: 'Organization B',
    slug: 'organization-b',
  };

  const projectA = {
    id: '30000000-0000-0000-0000-000000000001',
    organizationId: orgA.id,
    name: 'Project A',
    slug: 'project-a',
  };

  const projectB = {
    id: '30000000-0000-0000-0000-000000000002',
    organizationId: orgB.id,
    name: 'Project B',
    slug: 'project-b',
  };

  beforeAll(() => {
    // Mock user auth lookup
    jest.spyOn(authRepository, 'findById').mockImplementation(async (id) => {
      if (id === userA.id) return userA;
      if (id === userB.id) return userB;
      return null;
    });

    // Mock org lookup & membership
    jest.spyOn(organizationRepository, 'findById').mockImplementation(async (id) => {
      if (id === orgA.id) return orgA;
      if (id === orgB.id) return orgB;
      return null;
    });

    jest.spyOn(organizationRepository, 'findMembership').mockImplementation(async (orgId, userId) => {
      if (orgId === orgA.id && userId === userA.id) return { role: 'OWNER' };
      if (orgId === orgB.id && userId === userB.id) return { role: 'OWNER' };
      return null;
    });

    // Mock project repository
    jest.spyOn(projectRepository, 'findProjectsByOrganizationId').mockImplementation(async (orgId) => {
      if (orgId === orgA.id) return [projectA];
      if (orgId === orgB.id) return [projectB];
      return [];
    });

    jest.spyOn(projectRepository, 'findProjectByIdAndOrganizationId').mockImplementation(async (projId, orgId) => {
      if (projId === projectA.id && orgId === orgA.id) return projectA;
      if (projId === projectB.id && orgId === orgB.id) return projectB;
      return null;
    });

    jest.spyOn(projectRepository, 'update').mockImplementation(async (projId, data) => {
      if (projId === projectA.id) return { ...projectA, ...data };
      if (projId === projectB.id) return { ...projectB, ...data };
      return null;
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('User A attempting to access User B / Organization B resources', () => {
    it('1. User A cannot GET Organization B (Forbidden 403)', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgB.id}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('2. User A cannot GET Organization B projects list (Forbidden 403)', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgB.id}/projects`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('3. User A cannot GET Project B via Org B path (Forbidden 403)', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgB.id}/projects/${projectB.id}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('4. User A cannot PATCH Project B via Org B path (Forbidden 403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${orgB.id}/projects/${projectB.id}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ name: 'Hacked Project B' });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('5. IDOR Protection: User A requesting Project B under Org A path fails with 404 Not Found', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/projects/${projectB.id}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Authorized Access Verification', () => {
    it('User A CAN GET Organization A (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.organization.id).toBe(orgA.id);
    });

    it('User A CAN GET Project A in Organization A (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgA.id}/projects/${projectA.id}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.project.id).toBe(projectA.id);
    });
  });
});
