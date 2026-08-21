const rateLimitService = require('../shared/rate-limit/rate-limit.service');
const redisClient = require('../config/redis.client');
const config = require('../config/env');
const ErrorCodes = require('../shared/constants/error-codes');

/**
 * Project-Scoped Machine Notification API Rate Limit Middleware (X-API-Key authenticated endpoints)
 */
const rateLimitProjectNotification = async (req, res, next) => {
  // If request is not authenticated to a project (e.g. invalid API key), pass to auth handler
  if (!req.project || !req.project.id) {
    return next();
  }

  const projectId = req.project.id;
  const limit = config.NOTIFICATION_RATE_LIMIT || 100;
  const windowSeconds = config.NOTIFICATION_RATE_WINDOW_SECONDS || 60;

  const currentWindowTimestamp = Math.floor(Date.now() / (windowSeconds * 1000));
  const redisKey = `rate_limit:notifications:${projectId}:${currentWindowTimestamp}`;

  const result = await rateLimitService.checkAndIncrementRateLimit({
    redisClient,
    key: redisKey,
    limit,
    windowSeconds,
  });

  // Set standard rate limit headers
  res.setHeader('X-RateLimit-Limit', result.limit);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', result.resetTimestamp);

  if (!result.allowed) {
    if (result.error) {
      // Fail-closed strategy for Redis infrastructure failure
      return res.status(503).json({
        success: false,
        error: {
          code: ErrorCodes.SERVICE_UNAVAILABLE,
          message: 'Service temporarily unavailable. Please try again later.',
        },
      });
    }

    // Rate Limit Exceeded
    res.setHeader('Retry-After', result.resetSeconds);
    return res.status(429).json({
      success: false,
      error: {
        code: ErrorCodes.RATE_LIMIT_EXCEEDED,
        message: 'Too many notification requests for this project. Please try again later.',
      },
    });
  }

  return next();
};

/**
 * IP-Scoped Authentication Login Rate Limit Middleware
 */
const rateLimitIpAuthLogin = async (req, res, next) => {
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  const limit = config.AUTH_LOGIN_LIMIT || 5;
  const windowSeconds = config.AUTH_LOGIN_WINDOW_SECONDS || 60;

  const currentWindowTimestamp = Math.floor(Date.now() / (windowSeconds * 1000));
  const redisKey = `rate_limit:auth:login:${clientIp}:${currentWindowTimestamp}`;

  const result = await rateLimitService.checkAndIncrementRateLimit({
    redisClient,
    key: redisKey,
    limit,
    windowSeconds,
  });

  // Set standard rate limit headers
  res.setHeader('X-RateLimit-Limit', result.limit);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', result.resetTimestamp);

  if (!result.allowed) {
    if (result.error) {
      return res.status(503).json({
        success: false,
        error: {
          code: ErrorCodes.SERVICE_UNAVAILABLE,
          message: 'Service temporarily unavailable. Please try again later.',
        },
      });
    }

    res.setHeader('Retry-After', result.resetSeconds);
    return res.status(429).json({
      success: false,
      error: {
        code: ErrorCodes.RATE_LIMIT_EXCEEDED,
        message: 'Too many login attempts. Please try again later.',
      },
    });
  }

  return next();
};

module.exports = {
  rateLimitProjectNotification,
  rateLimitIpAuthLogin,
};
