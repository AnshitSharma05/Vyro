const prisma = require('../../config/database');
const redis = require('../../config/redis');

class HealthService {
  getLiveness() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness() {
    const checks = {
      database: 'down',
      redis: 'down',
    };

    let isHealthy = true;

    // Check PostgreSQL DB connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch (dbErr) {
      isHealthy = false;
      checks.database = 'error';
    }

    // Check Redis connection
    try {
      const pingRes = await redis.ping();
      if (pingRes === 'PONG') {
        checks.redis = 'ok';
      } else {
        isHealthy = false;
        checks.redis = 'degraded';
      }
    } catch (redisErr) {
      isHealthy = false;
      checks.redis = 'error';
    }

    return {
      status: checks.database === 'ok' ? 'ok' : 'degraded',
      healthy: checks.database === 'ok',
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}

module.exports = new HealthService();
