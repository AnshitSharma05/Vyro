const mockWebhookAdapter = require('../../src/providers/webhooks/mock-webhook.adapter');
const AuthenticationError = require('../../src/shared/errors/authentication-error');
const crypto = require('crypto');

describe('Webhook Signature & Normalization Unit Tests', () => {
  const secret = 'test_webhook_secret_key_123';
  const rawBody = JSON.stringify({
    providerEventId: 'evt-999',
    notificationId: 'notif-111',
    type: 'DELIVERED',
  });

  const validSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  it('1. Returns true for valid HMAC SHA-256 signature', () => {
    const isValid = mockWebhookAdapter.verifySignature(rawBody, validSignature, secret);
    expect(isValid).toBe(true);
  });

  it('2. Throws AuthenticationError for invalid / tampered signature', () => {
    const invalidSig = 'a'.repeat(64);
    expect(() => mockWebhookAdapter.verifySignature(rawBody, invalidSig, secret)).toThrow(AuthenticationError);
  });

  it('3. Normalizes mock provider webhook event into internal format', () => {
    const normalized = mockWebhookAdapter.normalizeEvent({
      providerEventId: 'evt-999',
      notificationId: 'notif-111',
      type: 'delivered',
    });

    expect(normalized.provider).toBe('mock');
    expect(normalized.providerEventId).toBe('evt-999');
    expect(normalized.notificationId).toBe('notif-111');
    expect(normalized.type).toBe('DELIVERED');
  });
});
