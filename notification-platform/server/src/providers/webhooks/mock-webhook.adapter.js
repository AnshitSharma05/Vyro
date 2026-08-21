const crypto = require('crypto');
const AuthenticationError = require('../../shared/errors/authentication-error');

class MockWebhookAdapter {
  constructor() {
    this.name = 'mock';
  }

  /**
   * Verifies the incoming mock provider HMAC signature.
   *
   * @param {string} rawBody
   * @param {string} signature Header signature
   * @param {string} secret Provider webhook secret
   * @returns {boolean}
   */
  verifySignature(rawBody, signature, secret) {
    if (!signature || !secret) {
      throw new AuthenticationError('Missing webhook signature or provider secret');
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody || '')
      .digest('hex');

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length) {
      throw new AuthenticationError('Invalid provider webhook signature');
    }

    const matches = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    if (!matches) {
      throw new AuthenticationError('Invalid provider webhook signature');
    }

    return true;
  }

  /**
   * Normalizes raw webhook payload into standardized internal event format.
   *
   * @param {Object} body
   * @returns {{ provider: string, providerEventId: string, providerMessageId: string|null, notificationId: string, type: string, occurredAt: Date, metadata: Object }}
   */
  normalizeEvent(body) {
    if (!body || typeof body !== 'object') {
      throw new Error('Invalid webhook payload body');
    }

    const typeUpper = String(body.type || body.event || 'DELIVERED').toUpperCase();

    // Map internal types: SENT, DELIVERED, FAILED, BOUNCED, COMPLAINED
    let type = 'DELIVERED';
    if (typeUpper.includes('BOUNCE')) type = 'BOUNCED';
    else if (typeUpper.includes('FAIL')) type = 'FAILED';
    else if (typeUpper.includes('COMPLAIN')) type = 'COMPLAINED';
    else if (typeUpper.includes('SENT')) type = 'SENT';

    return {
      provider: this.name,
      providerEventId: body.providerEventId || body.eventId || `mock_evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      providerMessageId: body.providerMessageId || body.messageId || null,
      notificationId: body.notificationId,
      type,
      occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
      metadata: body.metadata || {},
    };
  }
}

module.exports = new MockWebhookAdapter();
