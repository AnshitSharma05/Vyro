describe('Environment Variable Validation Unit Tests (PHASE 22)', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('1. Validates environment variables successfully with valid configuration', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_SECRET = 'super_secret_jwt_key_123456789';
    process.env.API_KEY_HASH_SECRET = 'super_secret_api_key_hash_secret_123456789';

    const config = require('../../src/config/env');
    expect(config.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/db');
    expect(config.PORT).toBe(5000);
  });

  it('2. Fails validation when required environment variables are missing', () => {
    delete process.env.DATABASE_URL;
    process.env.NODE_ENV = 'test';

    expect(() => {
      require('../../src/config/env');
    }).toThrow();
  });
});
