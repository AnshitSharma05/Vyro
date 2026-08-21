const fcmPushProvider = require('../../src/providers/push/push.provider');
const ProviderError = require('../../src/shared/errors/provider-error');

describe('FCM Push Provider Unit Tests', () => {
  it('1. Returns normalized success result for valid device token and notification body', async () => {
    const result = await fcmPushProvider.send({
      recipient: 'fcm_device_token_abc123xyz',
      subject: 'Flash Sale Alert!',
      body: 'Get 50% off on all items today only!',
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe('fcm');
    expect(result.providerMessageId).toBeDefined();
    expect(result.metadata.channel).toBe('PUSH');
  });

  it('2. Throws ProviderError when device token is empty', async () => {
    await expect(
      fcmPushProvider.send({
        recipient: '   ',
        body: 'Push payload',
      })
    ).rejects.toThrow(ProviderError);
  });

  it('3. Throws ProviderError when notification body is empty', async () => {
    await expect(
      fcmPushProvider.send({
        recipient: 'valid_token_123',
        body: '',
      })
    ).rejects.toThrow(ProviderError);
  });
});
