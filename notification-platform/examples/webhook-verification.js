const crypto = require('crypto');

/**
 * Example 5: Cryptographic Webhook Signature Verification Helper
 *
 * @param {string} payload - Raw HTTP request body string
 * @param {string} signature - Value from 'X-Webhook-Signature' HTTP header
 * @param {string} secret - Customer Webhook Secret Key
 * @returns {boolean} True if signature is valid, false otherwise
 */
function verifyWebhookSignature(payload, signature, secret) {
  if (!payload || !signature || !secret) {
    return false;
  }

  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

// Demo usage
const mockBody = JSON.stringify({
  event: 'notification.sent',
  notificationId: 'notif_12345',
  recipient: 'user@example.com',
  timestamp: new Date().toISOString(),
});
const mockSecret = 'whsec_test_secret_key_12345';
const validSignature = crypto.createHmac('sha256', mockSecret).update(mockBody).digest('hex');

console.log('--- Webhook Signature Verification Demo ---');
console.log(`Payload: ${mockBody}`);
console.log(`Signature: ${validSignature}`);
const isValid = verifyWebhookSignature(mockBody, validSignature, mockSecret);
console.log(`✅ Signature Verified: ${isValid}`);

module.exports = verifyWebhookSignature;
