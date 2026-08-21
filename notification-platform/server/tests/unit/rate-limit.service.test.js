const rateLimitService = require('../../src/shared/rate-limit/rate-limit.service');
const { rateLimitProjectNotification } = require('../../src/middlewares/rate-limit.middleware');

describe('Rate Limit Service & Middleware Unit Tests', () => {
  let mockRedis;

  beforeEach(() => {
    mockRedis = {
      incr: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('RateLimitService', () => {
    it('1. First request increments counter and sets TTL expiration', async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);
      mockRedis.ttl.mockResolvedValue(60);

      const result = await rateLimitService.checkAndIncrementRateLimit({
        redisClient: mockRedis,
        key: 'rate_limit:test:proj-1:100',
        limit: 10,
        windowSeconds: 60,
      });

      expect(result.allowed).toBe(true);
      expect(result.total).toBe(1);
      expect(result.remaining).toBe(9);
      expect(mockRedis.incr).toHaveBeenCalledWith('rate_limit:test:proj-1:100');
      expect(mockRedis.expire).toHaveBeenCalledWith('rate_limit:test:proj-1:100', 60);
    });

    it('2. Request count > limit returns allowed: false and remaining: 0', async () => {
      mockRedis.incr.mockResolvedValue(11);
      mockRedis.ttl.mockResolvedValue(45);

      const result = await rateLimitService.checkAndIncrementRateLimit({
        redisClient: mockRedis,
        key: 'rate_limit:test:proj-1:100',
        limit: 10,
        windowSeconds: 60,
      });

      expect(result.allowed).toBe(false);
      expect(result.total).toBe(11);
      expect(result.remaining).toBe(0);
      expect(result.resetSeconds).toBe(45);
      expect(mockRedis.expire).not.toHaveBeenCalled(); // Only set on count = 1
    });

    it('3. Fails closed on Redis exception', async () => {
      mockRedis.incr.mockRejectedValue(new Error('Redis connection refused'));

      const result = await rateLimitService.checkAndIncrementRateLimit({
        redisClient: mockRedis,
        key: 'rate_limit:test:proj-1:100',
        limit: 10,
        windowSeconds: 60,
      });

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(true);
    });
  });
});
