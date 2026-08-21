const HttpClient = require('../src/http');
const WebhooksResource = require('../src/resources/webhooks');
const crypto = require('crypto');

describe('SDK HTTP Client & Webhook Verification Unit Tests (PHASE 20)', () => {
  it('1. Webhook verifySignature validates authentic HMAC SHA-256 signatures accurately', () => {
    const webhooks = new WebhooksResource(null);
    const secret = 'whsec_secret_key_12345';
    const payload = JSON.stringify({ event: 'notification.sent', notificationId: 'notif_1001' });
    const timestamp = Math.floor(Date.now() / 1000);

    const signedPayload = `${timestamp}.${payload}`;
    const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
    const header = `t=${timestamp},v1=${signature}`;

    const isValid = webhooks.verifySignature(payload, header, secret);
    expect(isValid).toBe(true);
  });

  it('2. Webhook verifySignature rejects tampered payload or invalid secret', () => {
    const webhooks = new WebhooksResource(null);
    const secret = 'whsec_secret_key_12345';
    const payload = JSON.stringify({ event: 'notification.sent', notificationId: 'notif_1001' });
    const timestamp = Math.floor(Date.now() / 1000);

    const signedPayload = `${timestamp}.${payload}`;
    const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
    const header = `t=${timestamp},v1=${signature}`;

    const isTamperedValid = webhooks.verifySignature(payload + 'tampered', header, secret);
    expect(isTamperedValid).toBe(false);

    const isWrongSecretValid = webhooks.verifySignature(payload, header, 'wrong_secret');
    expect(isWrongSecretValid).toBe(false);
  });
});
