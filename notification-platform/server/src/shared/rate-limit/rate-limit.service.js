const logger = require('../utils/logger');

class RateLimitService {
  /**
   * Executes atomic Redis INCR & EXPIRE for rate limit window checking.
   *
   * @param {Object} redisClient Redis client instance (ioredis / node-redis)
   * @param {string} key Redis key
   * @param {number} limit Maximum allowed requests per window
   * @param {number} windowSeconds Fixed window duration in seconds
   * @returns {Promise<{ allowed: boolean, limit: number, remaining: number, resetSeconds: number, resetTimestamp: number, error?: boolean }>}
   */
  async checkAndIncrementRateLimit({ redisClient, key, limit, windowSeconds }) {
    try {
      if (!redisClient) {
        throw new Error('Redis client instance is missing');
      }

      // 1. Atomic Increment
      let count;
      if (typeof redisClient.incr === 'function') {
        count = await redisClient.incr(key);
      } else {
        throw new Error('Redis client does not support incr operation');
      }

      // 2. Set Expiration on First Increment
      if (count === 1) {
        if (typeof redisClient.expire === 'function') {
          await redisClient.expire(key, windowSeconds);
        }
      }

      // 3. Query TTL for Reset Timestamp
      let ttl = windowSeconds;
      if (typeof redisClient.ttl === 'function') {
        const queryTtl = await redisClient.ttl(key);
        if (queryTtl > 0) {
          ttl = queryTtl;
        }
      }

      const remaining = Math.max(0, limit - count);
      const allowed = count <= limit;
      const resetTimestamp = Math.floor(Date.now() / 1000) + ttl;

      return {
        total: count,
        limit,
        remaining,
        resetSeconds: ttl,
        resetTimestamp,
        allowed,
      };
    } catch (error) {
      logger.error({ key, error: error.message }, 'Redis rate limit check failed');
      // Fail-closed strategy for security and abuse protection
      return {
        allowed: false,
        error: true,
        limit,
        remaining: 0,
        resetSeconds: windowSeconds,
        resetTimestamp: Math.floor(Date.now() / 1000) + windowSeconds,
      };
    }
  }
}

module.exports = new RateLimitService();
