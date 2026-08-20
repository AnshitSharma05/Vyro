const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required').default('default_jwt_secret_dev_key_32bytes_min'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.string().transform((val) => parseInt(val, 10)).default('10'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment variables:', result.error.format());
    // For test environment fallback defaults if DATABASE_URL is unset
    if (process.env.NODE_ENV === 'test') {
      return {
        NODE_ENV: 'test',
        PORT: 3000,
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/notification_db_test',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'test_secret_key_for_unit_and_integration_tests',
        JWT_EXPIRES_IN: '1h',
        BCRYPT_SALT_ROUNDS: 4,
      };
    }
    throw new Error('Environment variable validation failed');
  }

  return result.data;
};

const config = parseEnv();

module.exports = config;
