const crypto = require('crypto');
const ValidationError = require('../errors/validation-error');

const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F]/;
const MAX_KEY_LENGTH = 255;

/**
 * Validates the Idempotency-Key header value.
 *
 * @param {string} key
 * @returns {string|null}
 */
function validateIdempotencyKey(key) {
  if (key === undefined || key === null || key === '') {
    return null;
  }

  if (typeof key !== 'string') {
    throw new ValidationError('Idempotency-Key must be a string');
  }

  const trimmed = key.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > MAX_KEY_LENGTH) {
    throw new ValidationError(`Idempotency-Key must not exceed ${MAX_KEY_LENGTH} characters`);
  }

  if (CONTROL_CHARS_REGEX.test(trimmed)) {
    throw new ValidationError('Idempotency-Key contains invalid control characters');
  }

  return trimmed;
}

/**
 * Recursively sorts keys of an object for deterministic canonical serialization.
 *
 * @param {any} obj
 * @returns {any}
 */
function sortObjectKeys(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  const sortedObj = {};
  Object.keys(obj)
    .sort()
    .forEach((k) => {
      sortedObj[k] = sortObjectKeys(obj[k]);
    });

  return sortedObj;
}

/**
 * Computes a deterministic SHA-256 request fingerprint hash.
 *
 * @param {{ template: string, recipient: string, data?: Object }} payload
 * @returns {string} SHA-256 hex digest
 */
function computeRequestHash({ template, recipient, data = {} }) {
  const canonicalPayload = {
    template: String(template || '').trim(),
    recipient: String(recipient || '').trim().toLowerCase(),
    data: sortObjectKeys(data || {}),
  };

  const canonicalString = JSON.stringify(canonicalPayload);
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}

module.exports = {
  validateIdempotencyKey,
  computeRequestHash,
  sortObjectKeys,
};
