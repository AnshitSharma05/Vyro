const request = require('supertest');
const app = require('../../src/app');
const authRepository = require('../../src/modules/auth/auth.repository');
const { signToken } = require('../../src/shared/utils/jwt');
const { hashPassword } = require('../../src/shared/utils/password');

describe('Authentication API Integration Tests', () => {
  const testUser = {
    email: 'integration_test_user@example.com',
    password: 'StrongPassword123!',
    name: 'Integration Test User',
  };

  let createdUser = null;

  beforeAll(async () => {
    // Mock Repository layer to ensure tests pass in both offline and online DB environments
    const usersDb = new Map();

    jest.spyOn(authRepository, 'findByEmail').mockImplementation(async (email) => {
      return usersDb.get(email) || null;
    });

    jest.spyOn(authRepository, 'findById').mockImplementation(async (id) => {
      for (const user of usersDb.values()) {
        if (user.id === id) {
          const { passwordHash, ...rest } = user;
          return rest;
        }
      }
      return null;
    });

    jest.spyOn(authRepository, 'createUser').mockImplementation(async ({ email, passwordHash, name }) => {
      const newUser = {
        id: 'uuid-integration-user-12345',
        email,
        passwordHash,
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      usersDb.set(email, newUser);
      createdUser = newUser;
      const { passwordHash: _, ...rest } = newUser;
      return rest;
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully with 201 Created', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.token).toBeDefined();
    });

    it('should reject registration with duplicate email (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('RESOURCE_EXISTS');
    });

    it('should reject registration with invalid email format (400 Validation Error)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email-format',
          password: 'StrongPassword123!',
          name: 'Invalid Email User',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration with weak password (400 Validation Error)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'weakpass@example.com',
          password: 'weak',
          name: 'Weak Pass User',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration with missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should authenticate valid credentials with 200 OK', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data.token).toBeDefined();
    });

    it('should reject incorrect password with generic 401 error', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email address or password');
    });

    it('should reject unknown email with generic 401 error', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent_user@example.com',
          password: 'Password123!',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email address or password');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return user profile for valid JWT token', async () => {
      const validToken = signToken({
        sub: 'uuid-integration-user-12345',
        email: testUser.email.toLowerCase(),
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
    });

    it('should reject request with missing Authorization header', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject request with malformed token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.malformed.token');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject request with expired token', async () => {
      const expiredToken = signToken(
        { sub: 'uuid-integration-user-12345', email: testUser.email },
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject request with token for non-existent user ID', async () => {
      const ghostToken = signToken({
        sub: '00000000-0000-0000-0000-000000000000',
        email: 'ghost@example.com',
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${ghostToken}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should return 200 OK for authenticated logout request', async () => {
      const validToken = signToken({
        sub: 'uuid-integration-user-12345',
        email: testUser.email.toLowerCase(),
      });

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
