const crypto = require('crypto');

class WebhooksResource {
  constructor(http) {
    this.http = http;
  }

  /**
   * Cryptographically verify an inbound webhook signature using HMAC SHA-256 constant-time comparison.
   *
   * @param {string|Buffer} rawPayload - Raw HTTP request body string or Buffer
   * @param {string} signatureHeader - Header value (format: "t=<timestamp>,v1=<signature>")
   * @param {string} secret - Customer webhook signing secret
   * @param {Object} [options]
   * @param {number} [options.toleranceSeconds=300] - Max allowed timestamp drift (seconds)
   * @returns {boolean}
   */
  verifySignature(rawPayload, signatureHeader, secret, { toleranceSeconds = 300 } = {}) {
    if (!rawPayload || !signatureHeader || !secret) {
      return false;
    }

    const payloadString = typeof rawPayload === 'string' ? rawPayload : rawPayload.toString('utf8');

    // Parse header: "t=1700000000,v1=6a7b..."
    const items = signatureHeader.split(',').reduce((acc, part) => {
      const [key, val] = part.trim().split('=');
      if (key && val) acc[key] = val;
      return acc;
    }, {});

    const timestampStr = items.t;
    const signature = items.v1;

    if (!timestampStr || !signature) {
      return false;
    }

    // Verify timestamp drift to prevent replay attacks
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return false;

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (toleranceSeconds > 0 && Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
      return false;
    }

    // Compute expected HMAC SHA-256
    const signedPayload = `${timestamp}.${payloadString}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const actualBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  }
}

module.exports = WebhooksResource;
