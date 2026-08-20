const request = require('supertest');
const express = require('express');
const app = require('../../src/app');
const organizationRepository = require('../../src/modules/organizations/organization.repository');
const projectRepository = require('../../src/modules/projects/project.repository');
const apiKeyRepository = require('../../src/modules/api-keys/api-key.repository');
const authRepository = require('../../src/modules/auth/auth.repository');
const authenticateApiKey = require('../../src/middlewares/api-key.middleware');
const { signToken } = require('../../src/shared/utils/jwt');
const { hashApiKey } = require('../../src/modules/api-keys/api-key.utils');

// Create test express app for testing machine-to-machine middleware
const testMachineApp = express();
testMachineApp.use(express.json());
testMachineApp.get('/test-protected-api', authenticateApiKey, (req, res) => {
  res.status(200).json({
    success: true,
    apiKey: req.apiKey,
    project: req.project,
  });
});

describe('API KEY MANAGEMENT & MACHINE AUTHENTICATION INTEGRATION TESTS', () => {
  const userA = {
    id: '11000000-0000-0000-0000-000000000001',
    email: 'usera_apikey@example.com',
    name: 'User A',
  };

  const userB = {
    id: '11000000-0000-0000-0000-000000000002',
    email: 'userb_apikey@example.com',
    name: 'User B',
  };

  const userMemberA = {
    id: '11000000-0000-0000-0000-000000000003',
    email: 'usermembera_apikey@example.com',
    name: 'User Member A',
  };

  const tokenUserA = signToken({ sub: userA.id, email: userA.email });
  const tokenUserB = signToken({ sub: userB.id, email: userB.email });
  const tokenUserMemberA = signToken({ sub: userMemberA.id, email: userMemberA.email });

  const orgA = {
    id: '22000000-0000-0000-0000-000000000001',
    name: 'Organization A',
    slug: 'organization-a',
  };

  const orgB = {
    id: '22000000-0000-0000-0000-000000000002',
    name: 'Organization B',
    slug: 'organization-b',
  };

  const projectA = {
    id: '33000000-0000-0000-0000-000000000001',
    organizationId: orgA.id,
    name: 'Project A',
    slug: 'project-a',
    organization: orgA,
  };

  const projectB = {
    id: '33000000-0000-0000-0000-000000000002',
    organizationId: orgB.id,
    name: 'Project B',
    slug: 'project-b',
    organization: orgB,
  };

  const inMemoryApiKeys = [];

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

    jest.spyOn(apiKeyRepository, 'create').mockImplementation(async (data) => {
      const record = {
        id: `key-${inMemoryApiKeys.length + 1}`,
        projectId: data.projectId,
        name: data.name,
        keyPrefix: data.keyPrefix,
        keyHash: data.keyHash,
        lastUsedAt: null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryApiKeys.push(record);
      return record;
    });

    jest.spyOn(apiKeyRepository, 'findByProjectId').mockImplementation(async (projId) => {
      return inMemoryApiKeys
        .filter((k) => k.projectId === projId)
        .map(({ keyHash, ...meta }) => meta);
    });

    jest.spyOn(apiKeyRepository, 'findByIdAndProjectId').mockImplementation(async (id, projId) => {
      return inMemoryApiKeys.find((k) => k.id === id && k.projectId === projId) || null;
    });

    jest.spyOn(apiKeyRepository, 'revoke').mockImplementation(async (id) => {
      const key = inMemoryApiKeys.find((k) => k.id === id);
      if (key) {
        key.revokedAt = new Date();
      }
      return key;
    });

    jest.spyOn(apiKeyRepository, 'findByPrefix').mockImplementation(async (prefix) => {
      return inMemoryApiKeys
        .filter((k) => k.keyPrefix === prefix)
        .map((k) => ({
          ...k,
          project: k.projectId === projectA.id ? projectA : projectB,
        }));
    });

    jest.spyOn(apiKeyRepository, 'updateLastUsedAt').mockImplementation(async (id) => {
      const key = inMemoryApiKeys.find((k) => k.id === id);
      if (key) key.lastUsedAt = new Date();
      return key;
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  let createdRawKeyA;
  let createdKeyIdA;

  describe('1. API Key Creation (JWT Authenticated)', () => {
    it('User A (OWNER of Org A) creates an API Key for Project A', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectA.id}/api-keys`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ name: 'Production Backend Key' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Production Backend Key');
      expect(res.body.data.key).toMatch(/^np_live_/);
      expect(res.body.data.keyPrefix).toMatch(/^np_live_/);
      expect(res.body.data.keyHash).toBeUndefined();

      createdRawKeyA = res.body.data.key;
      createdKeyIdA = res.body.data.id;
    });

    it('User Member A (MEMBER of Org A) CANNOT create API key (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectA.id}/api-keys`)
        .set('Authorization', `Bearer ${tokenUserMemberA}`)
        .send({ name: 'Unauthorized Key' });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('User B (Org B) CANNOT create API key for Project A (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectA.id}/api-keys`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({ name: 'Cross Org Key' });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. API Key Listing', () => {
    it('User A lists API keys for Project A (metadata only, no raw key or keyHash)', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectA.id}/api-keys`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.apiKeys).toHaveLength(1);
      const keyMeta = res.body.data.apiKeys[0];
      expect(keyMeta.name).toBe('Production Backend Key');
      expect(keyMeta.keyPrefix).toBeDefined();
      expect(keyMeta.key).toBeUndefined();
      expect(keyMeta.keyHash).toBeUndefined();
    });

    it('User B CANNOT list API keys for Project A (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectA.id}/api-keys`)
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(res.statusCode).toBe(403);
    });
  });

  describe('3. Machine-to-Machine API Key Authentication Middleware', () => {
    it('Valid X-API-Key authenticates and binds correctly to Project A & Org A', async () => {
      const res = await request(testMachineApp)
        .get('/test-protected-api')
        .set('X-API-Key', createdRawKeyA);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.apiKey.id).toBe(createdKeyIdA);
      expect(res.body.apiKey.projectId).toBe(projectA.id);
      expect(res.body.project.id).toBe(projectA.id);
      expect(res.body.project.organizationId).toBe(orgA.id);

      // Verify no sensitive fields leaked into context
      expect(res.body.apiKey.keyHash).toBeUndefined();
      expect(res.body.apiKey.rawKey).toBeUndefined();
    });

    it('Missing X-API-Key header fails with 401', async () => {
      const res = await request(testMachineApp).get('/test-protected-api');

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('API key is required');
    });

    it('Invalid X-API-Key string fails with 401', async () => {
      const res = await request(testMachineApp)
        .get('/test-protected-api')
        .set('X-API-Key', 'np_live_invalid_secret_key_string');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('4. Cross-Tenant API Key Security & Isolation Boundaries', () => {
    it('API Key A MUST NEVER authenticate or give access to Project B / Org B', async () => {
      const res = await request(testMachineApp)
        .get('/test-protected-api')
        .set('X-API-Key', createdRawKeyA);

      expect(res.statusCode).toBe(200);
      expect(res.body.project.id).not.toBe(projectB.id);
      expect(res.body.project.organizationId).not.toBe(orgB.id);
    });
  });

  describe('5. API Key Revocation & Expiration', () => {
    it('User Member A CANNOT revoke API Key A (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectA.id}/api-keys/${createdKeyIdA}/revoke`)
        .set('Authorization', `Bearer ${tokenUserMemberA}`);

      expect(res.statusCode).toBe(403);
    });

    it('User A (OWNER) revokes API Key A (200 OK)', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectA.id}/api-keys/${createdKeyIdA}/revoke`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.apiKey.revokedAt).toBeDefined();
    });

    it('Revoked API Key A immediately fails machine authentication (401 Unauthorized)', async () => {
      const res = await request(testMachineApp)
        .get('/test-protected-api')
        .set('X-API-Key', createdRawKeyA);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('revoked');
    });
  });
});
