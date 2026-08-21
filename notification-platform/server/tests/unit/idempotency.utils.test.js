const { validateIdempotencyKey, computeRequestHash } = require('../../src/shared/utils/idempotency.utils');
const ValidationError = require('../../src/shared/errors/validation-error');

describe('Idempotency Utility Unit Tests', () => {
  describe('validateIdempotencyKey', () => {
    it('returns null if key is omitted or null', () => {
      expect(validateIdempotencyKey(null)).toBeNull();
      expect(validateIdempotencyKey(undefined)).toBeNull();
      expect(validateIdempotencyKey('')).toBeNull();
    });

    it('returns trimmed string for valid key', () => {
      expect(validateIdempotencyKey('  order-123-key  ')).toBe('order-123-key');
    });

    it('throws ValidationError if key exceeds 255 characters', () => {
      const longKey = 'a'.repeat(256);
      expect(() => validateIdempotencyKey(longKey)).toThrow(ValidationError);
    });

    it('throws ValidationError if key contains control characters', () => {
      const invalidKey = 'order-123\x07-key';
      expect(() => validateIdempotencyKey(invalidKey)).toThrow(ValidationError);
    });
  });

  describe('computeRequestHash', () => {
    it('produces identical hashes for objects with different key ordering', () => {
      const hash1 = computeRequestHash({
        template: 'order-confirmed',
        recipient: 'anshit@example.com',
        data: { orderId: '123', name: 'Anshit' },
      });

      const hash2 = computeRequestHash({
        template: 'order-confirmed',
        recipient: 'anshit@example.com',
        data: { name: 'Anshit', orderId: '123' },
      });

      expect(hash1).toBe(hash2);
    });

    it('produces different hashes when request fields differ', () => {
      const baseHash = computeRequestHash({
        template: 'order-confirmed',
        recipient: 'anshit@example.com',
        data: { orderId: '123' },
      });

      const diffRecipient = computeRequestHash({
        template: 'order-confirmed',
        recipient: 'other@example.com',
        data: { orderId: '123' },
      });

      const diffTemplate = computeRequestHash({
        template: 'password-reset',
        recipient: 'anshit@example.com',
        data: { orderId: '123' },
      });

      const diffData = computeRequestHash({
        template: 'order-confirmed',
        recipient: 'anshit@example.com',
        data: { orderId: '999' },
      });

      expect(baseHash).not.toBe(diffRecipient);
      expect(baseHash).not.toBe(diffTemplate);
      expect(baseHash).not.toBe(diffData);
    });
  });
});
