const {
  generateApiKey,
  hashApiKey,
  compareKeyHash,
  extractKeyPrefix,
} = require('../../src/modules/api-keys/api-key.utils');

describe('ApiKey Utils', () => {
  describe('generateApiKey', () => {
    it('should generate a valid raw key, key prefix, and secret with expected format', () => {
      const { rawKey, keyPrefix, secret } = generateApiKey();

      expect(rawKey).toBeDefined();
      expect(keyPrefix).toBeDefined();
      expect(secret).toBeDefined();

      expect(rawKey.startsWith('np_live_')).toBe(true);
      expect(keyPrefix.startsWith('np_live_')).toBe(true);
      expect(rawKey).toBe(`${keyPrefix}_${secret}`);
      expect(keyPrefix.length).toBe(16); // 'np_live_' (8) + 8 hex chars
      expect(secret.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should generate unique keys on consecutive calls', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();

      expect(key1.rawKey).not.toEqual(key2.rawKey);
      expect(key1.keyPrefix).not.toEqual(key2.keyPrefix);
    });
  });

  describe('hashApiKey', () => {
    it('should compute a 64-character SHA-256 hex hash', () => {
      const { rawKey } = generateApiKey();
      const hash = hashApiKey(rawKey);

      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64);
    });

    it('should produce identical hash for same raw key', () => {
      const { rawKey } = generateApiKey();
      const hash1 = hashApiKey(rawKey);
      const hash2 = hashApiKey(rawKey);

      expect(hash1).toBe(hash2);
    });

    it('should throw if raw key is empty or not a string', () => {
      expect(() => hashApiKey('')).toThrow();
      expect(() => hashApiKey(null)).toThrow();
    });
  });

  describe('compareKeyHash', () => {
    it('should return true for matching hashes', () => {
      const { rawKey } = generateApiKey();
      const hash1 = hashApiKey(rawKey);
      const hash2 = hashApiKey(rawKey);

      expect(compareKeyHash(hash1, hash2)).toBe(true);
    });

    it('should return false for different hashes of equal length', () => {
      const hash1 = hashApiKey('np_live_12345678_secret1');
      const hash2 = hashApiKey('np_live_12345678_secret2');

      expect(compareKeyHash(hash1, hash2)).toBe(false);
    });

    it('should return false if arguments are not strings', () => {
      expect(compareKeyHash(null, 'hash')).toBe(false);
      expect(compareKeyHash('hash', undefined)).toBe(false);
    });
  });

  describe('extractKeyPrefix', () => {
    it('should extract correct prefix from a formatted API key', () => {
      const rawKey = 'np_live_a8f3b19c_83f9104b2c894e72a129d58b';
      const prefix = extractKeyPrefix(rawKey);

      expect(prefix).toBe('np_live_a8f3b19c');
    });

    it('should return null for malformed API keys', () => {
      expect(extractKeyPrefix('invalid_prefix_secret')).toBeNull();
      expect(extractKeyPrefix('np_live_short')).toBeNull();
      expect(extractKeyPrefix('')).toBeNull();
      expect(extractKeyPrefix(null)).toBeNull();
    });
  });
});
