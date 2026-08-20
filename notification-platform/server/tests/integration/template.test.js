const request = require('supertest');
const app = require('../../src/app');
const organizationRepository = require('../../src/modules/organizations/organization.repository');
const projectRepository = require('../../src/modules/projects/project.repository');
const templateRepository = require('../../src/modules/templates/template.repository');
const authRepository = require('../../src/modules/auth/auth.repository');
const { signToken } = require('../../src/shared/utils/jwt');

describe('TEMPLATE MANAGEMENT INTEGRATION & CROSS-TENANT SECURITY TESTS', () => {
  const userA = {
    id: '21000000-0000-0000-0000-000000000001',
    email: 'usera_template@example.com',
    name: 'User A',
  };

  const userB = {
    id: '21000000-0000-0000-0000-000000000002',
    email: 'userb_template@example.com',
    name: 'User B',
  };

  const userMemberA = {
    id: '21000000-0000-0000-0000-000000000003',
    email: 'usermembera_template@example.com',
    name: 'User Member A',
  };

  const tokenUserA = signToken({ sub: userA.id, email: userA.email });
  const tokenUserB = signToken({ sub: userB.id, email: userB.email });
  const tokenUserMemberA = signToken({ sub: userMemberA.id, email: userMemberA.email });

  const orgA = {
    id: '31000000-0000-0000-0000-000000000001',
    name: 'Organization A',
    slug: 'org-a',
  };

  const orgB = {
    id: '31000000-0000-0000-0000-000000000002',
    name: 'Organization B',
    slug: 'org-b',
  };

  const projectA = {
    id: '41000000-0000-0000-0000-000000000001',
    organizationId: orgA.id,
    name: 'Project A',
    slug: 'proj-a',
  };

  const projectB = {
    id: '41000000-0000-0000-0000-000000000002',
    organizationId: orgB.id,
    name: 'Project B',
    slug: 'proj-b',
  };

  const inMemoryTemplates = [];

  beforeAll(() => {
    jest.spyOn(authRepository, 'findById').mockImplementation(async (id) => {
      if (id === userA.id) return userA;
      if (id === userB.id) return userB;
      if (id === userMemberA.id) return userMemberA;
      return null;
    });

    jest.spyOn(organizationRepository, 'findMembership').mockImplementation(async (orgId, userId) => {
      if (orgId === orgA.id && userId === userA.id) return { role: 'OWNER' };
      if (orgId === orgA.id && userId === userMemberA.id) return { role: 'MEMBER' };
      if (orgId === orgB.id && userId === userB.id) return { role: 'OWNER' };
      return null;
    });

    jest.spyOn(projectRepository, 'findProjectById').mockImplementation(async (projId) => {
      if (projId === projectA.id) return projectA;
      if (projId === projectB.id) return projectB;
      return null;
    });

    jest.spyOn(templateRepository, 'create').mockImplementation(async (data) => {
      const record = {
        id: `tpl-${inMemoryTemplates.length + 1}`,
        projectId: data.projectId,
        name: data.name,
        channel: data.channel,
        subject: data.subject || null,
        body: data.body,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryTemplates.push(record);
      return record;
    });

    jest.spyOn(templateRepository, 'findByNameAndProjectId').mockImplementation(async (name, projId) => {
      return inMemoryTemplates.find((t) => t.name === name && t.projectId === projId) || null;
    });

    jest.spyOn(templateRepository, 'findByIdAndProjectId').mockImplementation(async (id, projId) => {
      return inMemoryTemplates.find((t) => t.id === id && t.projectId === projId) || null;
    });

    jest.spyOn(templateRepository, 'findManyByProjectId').mockImplementation(async ({ projectId, page = 1, limit = 20, channel }) => {
      let filtered = inMemoryTemplates.filter((t) => t.projectId === projectId);
      if (channel) {
        filtered = filtered.filter((t) => t.channel === channel);
      }
      return {
        templates: filtered,
        totalCount: filtered.length,
        page,
        limit,
        totalPages: 1,
      };
    });

    jest.spyOn(templateRepository, 'update').mockImplementation(async (id, data) => {
      const index = inMemoryTemplates.findIndex((t) => t.id === id);
      if (index !== -1) {
        inMemoryTemplates[index] = { ...inMemoryTemplates[index], ...data, updatedAt: new Date() };
        return inMemoryTemplates[index];
      }
      return null;
    });

    jest.spyOn(templateRepository, 'delete').mockImplementation(async (id) => {
      const index = inMemoryTemplates.findIndex((t) => t.id === id);
      if (index !== -1) {
        return inMemoryTemplates.splice(index, 1)[0];
      }
      return null;
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  let createdTplIdA;

  describe('1. Template Creation & Channel Validation', () => {
    it('User A (OWNER) creates an EMAIL template for Project A (201 Created)', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectA.id}/templates`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          name: 'order-confirmed',
          channel: 'EMAIL',
          subject: 'Order {{orderId}} Confirmed',
          body: 'Hello {{name}}, your order {{orderId}} has been confirmed.',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.template.name).toBe('order-confirmed');
      expect(res.body.data.template.variables).toEqual(['orderId', 'name']);

      createdTplIdA = res.body.data.template.id;
    });

    it('Fails to create EMAIL template when subject is missing (400 Bad Request)', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectA.id}/templates`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          name: 'welcome-email',
          channel: 'EMAIL',
          body: 'Hello {{name}}',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('User A creates an SMS template for Project A without subject (201 Created)', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectA.id}/templates`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          name: 'otp-verification',
          channel: 'SMS',
          body: 'Your OTP is {{otp}}',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.template.subject).toBeNull();
    });

    it('Fails to create SMS template when subject is provided (400 Bad Request)', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectA.id}/templates`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          name: 'invalid-sms',
          channel: 'SMS',
          subject: 'Forbidden Subject',
          body: 'Your OTP is {{otp}}',
        });

      expect(res.statusCode).toBe(400);
    });

    it('User Member A (MEMBER role) CANNOT create template (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectA.id}/templates`)
        .set('Authorization', `Bearer ${tokenUserMemberA}`)
        .send({
          name: 'member-template',
          channel: 'SMS',
          body: 'Body',
        });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('2. Template Name Uniqueness & Scope', () => {
    it('Duplicate template name within Project A fails (409 Conflict)', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectA.id}/templates`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          name: 'order-confirmed',
          channel: 'EMAIL',
          subject: 'Duplicate Order',
          body: 'Body',
        });

      expect(res.statusCode).toBe(409);
    });

    it('Same template name ("order-confirmed") in Project B (Org B) succeeds (201 Created)', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectB.id}/templates`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({
          name: 'order-confirmed',
          channel: 'EMAIL',
          subject: 'Project B Order {{orderId}}',
          body: 'Project B Hello {{name}}',
        });

      expect(res.statusCode).toBe(201);
    });
  });

  describe('3. Template Listing & Pagination', () => {
    it('User Member A CAN list templates in Project A (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectA.id}/templates`)
        .set('Authorization', `Bearer ${tokenUserMemberA}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.templates.length).toBeGreaterThanOrEqual(2);
    });

    it('Filter templates by channel=EMAIL', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectA.id}/templates?channel=EMAIL`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.templates.every((t) => t.channel === 'EMAIL')).toBe(true);
    });
  });

  describe('4. Template Preview', () => {
    it('User A previews template rendering with valid variables (200 OK)', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectA.id}/templates/preview`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          templateId: createdTplIdA,
          data: {
            name: 'Anshit',
            orderId: 'ORD-12345',
          },
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.subject).toBe('Order ORD-12345 Confirmed');
      expect(res.body.data.body).toBe('Hello Anshit, your order ORD-12345 has been confirmed.');
    });

    it('Preview fails with 400 when missing required variables', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectA.id}/templates/preview`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          templateId: createdTplIdA,
          data: {
            name: 'Anshit', // missing orderId
          },
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Missing required template variables');
    });
  });

  describe('5. Cross-Tenant Security & Isolation Boundaries', () => {
    it('User B (Org B) CANNOT GET Template A in Project A (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectA.id}/templates/${createdTplIdA}`)
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(res.statusCode).toBe(403);
    });

    it('User B (Org B) CANNOT UPDATE Template A in Project A (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${projectA.id}/templates/${createdTplIdA}`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({ body: 'Hacked Body' });

      expect(res.statusCode).toBe(403);
    });

    it('User B (Org B) CANNOT DELETE Template A in Project A (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/${projectA.id}/templates/${createdTplIdA}`)
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(res.statusCode).toBe(403);
    });
  });

  describe('6. Template Deletion', () => {
    it('User A (OWNER) deletes Template A (200 OK)', async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/${projectA.id}/templates/${createdTplIdA}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.statusCode).toBe(200);
    });
  });
});
