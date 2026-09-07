const { z } = require('zod');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z
    .string()
    .min(1)
    .default(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/notification_db?schema=public'),
  REDIS_URL: z.string().min(1).default(process.env.REDIS_URL || 'redis://localhost:6379'),

  JWT_SECRET: z
    .string()
    .min(8)
    .default(process.env.JWT_SECRET || 'test_jwt_secret_key_minimum_32_characters_long'),
  JWT_EXPIRES_IN: z.string().default('24h'),

  API_KEY_HASH_SECRET: z
    .string()
    .min(8)
    .default(process.env.API_KEY_HASH_SECRET || 'test_api_key_hash_secret_minimum_32_characters_long'),

  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),

  NOTIFICATION_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(3),
  NOTIFICATION_RETRY_DELAY: z.coerce.number().int().min(100).default(5000),

  SMTP_HOST: z.string().optional().default('localhost'),
  SMTP_PORT: z.coerce.number().int().optional().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional().default('noreply@notificationplatform.com'),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ FATAL: Environment Variable Validation Failed:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    } else {
      throw new Error('Environment variable validation failed');
    }
  }

  const env = result.data;

  // Gmail app passwords are often pasted with spaces — normalize for SMTP auth
  if (env.SMTP_PASS) {
    env.SMTP_PASS = env.SMTP_PASS.replace(/\s/g, '');
  }

  const insecureSecrets = ['secret', 'jwt_secret', 'changeme', '12345678', 'password', 'api_key_secret'];
  if (env.NODE_ENV === 'production') {
    if (insecureSecrets.includes(env.JWT_SECRET.toLowerCase())) {
      console.error('❌ FATAL: Insecure JWT_SECRET detected in production environment.');
      process.exit(1);
    }
    if (insecureSecrets.includes(env.API_KEY_HASH_SECRET.toLowerCase())) {
      console.error('❌ FATAL: Insecure API_KEY_HASH_SECRET detected in production environment.');
      process.exit(1);
    }
  }

  return env;
}

const config = validateEnv();

module.exports = config;
