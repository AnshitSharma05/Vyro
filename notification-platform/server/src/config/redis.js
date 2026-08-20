const config = require('./env');

/**
 * Parses REDIS_URL into BullMQ / ioredis connection options object.
 *
 * @param {string} urlString
 * @returns {import('bullmq').ConnectionOptions}
 */
function parseRedisOptions(urlString) {
  try {
    const parsed = new URL(urlString);
    return {
      host: parsed.hostname || 'localhost',
      port: parsed.port ? parseInt(parsed.port, 10) : 6379,
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      db: parsed.pathname ? parseInt(parsed.pathname.replace('/', ''), 10) || 0 : 0,
      maxRetriesPerRequest: null, // Required by BullMQ
    };
  } catch (error) {
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    };
  }
}

const redisOptions = parseRedisOptions(config.REDIS_URL || process.env.REDIS_URL || 'redis://localhost:6379');

module.exports = redisOptions;
