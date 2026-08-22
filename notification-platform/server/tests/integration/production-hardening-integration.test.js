const request = require('supertest');
const app = require('../../src/app');
const healthService = require('../../src/modules/health/health.service');

describe('PRODUCTION HARDENING & RELIABILITY INTEGRATION TESTS (PHASE 22)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('1. Returns 200 OK for Liveness probe GET /health/live', async () => {
    const res = await request(app).get('/health/live');

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('ok');
    expect(typeof res.body.data.uptime).toBe('number');
  });

  it('2. Returns 200 OK for Readiness probe GET /health/ready when dependencies are healthy', async () => {
    jest.spyOn(healthService, 'getReadiness').mockResolvedValue({
      status: 'ok',
      healthy: true,
      timestamp: new Date().toISOString(),
      checks: { database: 'ok', redis: 'ok' },
    });

    const res = await request(app).get('/health/ready');

    expect(res.statusCode).toBe(200);
    expect(res.body.data.checks.database).toBe('ok');
    expect(res.body.data.checks.redis).toBe('ok');
  });

  it('3. Returns 503 Service Unavailable when Readiness probe dependency is degraded', async () => {
    jest.spyOn(healthService, 'getReadiness').mockResolvedValue({
      status: 'degraded',
      healthy: false,
      timestamp: new Date().toISOString(),
      checks: { database: 'ok', redis: 'error' },
    });

    const res = await request(app).get('/health/ready');

    expect(res.statusCode).toBe(503);
    expect(res.body.data.checks.redis).toBe('error');
  });

  it('4. Attaches and propagates X-Request-ID header across HTTP responses', async () => {
    const customRequestId = 'req_custom_test_12345';
    const res = await request(app)
      .get('/health/live')
      .set('X-Request-ID', customRequestId);

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-request-id']).toBe(customRequestId);
  });

  it('5. Auto-generates a valid X-Request-ID if not supplied by client', async () => {
    const res = await request(app).get('/health/live');

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-request-id']).toMatch(/^req_/);
  });

  it('6. Rejects requests from unauthorized origins according to CORS policy', async () => {
    const res = await request(app)
      .get('/api/v1/plans')
      .set('Origin', 'http://malicious-attacker-domain.com');

    expect(res.statusCode).toBe(403);
    expect(res.body.error.code).toBe('CORS_VIOLATION');
  });
});
