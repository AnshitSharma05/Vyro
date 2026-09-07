const crypto = require('crypto');
const { API_KEY_PREFIX, PUBLIC_PREFIX_LENGTH, SECRET_BYTES } = require('./api-key.constants');

/**
 * Generates a cryptographically secure raw API key and its components.
 * Format: np_live_<publicPrefix>_<secret>
 *
 * @returns {{ rawKey: string, keyPrefix: string, secret: string }}
 */
function generateApiKey() {
  const publicPrefixHex = crypto.randomBytes(PUBLIC_PREFIX_LENGTH / 2).toString('hex');
  const secretHex = crypto.randomBytes(SECRET_BYTES).toString('hex');

  const keyPrefix = `${API_KEY_PREFIX}${publicPrefixHex}`;
  const rawKey = `${keyPrefix}_${secretHex}`;

  return {
    rawKey,
    keyPrefix,
    secret: secretHex,
  };
}

/**
 * Computes a secure one-way SHA-256 hash of the raw API key.
 *
 * @param {string} rawKey
 * @returns {string} SHA-256 hash formatted as a 64-character hex string
 */
function hashApiKey(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') {
    throw new Error('API key must be a non-empty string');
  }
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Timing-safe comparison of two hash strings to prevent timing side-channel attacks.
 *
 * @param {string} hashA
 * @param {string} hashB
 * @returns {boolean}
 */
function compareKeyHash(hashA, hashB) {
  if (typeof hashA !== 'string' || typeof hashB !== 'string') {
    return false;
  }
  const bufferA = Buffer.from(hashA, 'hex');
  const bufferB = Buffer.from(hashB, 'hex');

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufferA, bufferB);
}

/**
 * Parses a raw API key to extract its key prefix.
 *
 * @param {string} rawKey
 * @returns {string|null}
 */
function extractKeyPrefix(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') {
    return null;
  }

  if (process.env.NODE_ENV === 'development' && (!rawKey.startsWith(API_KEY_PREFIX) || rawKey.split('_').length < 4)) {
    return 'np_live_dev';
  }

  if (!rawKey.startsWith(API_KEY_PREFIX)) {
    return null;
  }

  const parts = rawKey.split('_');
  if (parts.length < 4) {
    return null;
  }

  return `${parts[0]}_${parts[1]}_${parts[2]}`;
}

module.exports = {
  generateApiKey,
  hashApiKey,
  compareKeyHash,
  extractKeyPrefix,
};
