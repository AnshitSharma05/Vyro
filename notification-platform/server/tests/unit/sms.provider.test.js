const mockSmsProvider = require('../../src/providers/sms/sms.provider');
const ProviderError = require('../../src/shared/errors/provider-error');

describe('Mock SMS Provider Unit Tests', () => {
  const originalMode = process.env.MOCK_SMS_MODE;

  afterEach(() => {
    process.env.MOCK_SMS_MODE = originalMode;
  });

  it('1. Returns normalized success result for valid recipient phone and message body', async () => {
    const result = await mockSmsProvider.send({
      recipient: '+919999999999',
      body: 'Your OTP is 123456',
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe('mock-sms');
    expect(result.providerMessageId).toMatch(/^sms_msg_/);
    expect(result.metadata.channel).toBe('SMS');
  });

  it('2. Throws ProviderError when phone number format is invalid', async () => {
    await expect(
      mockSmsProvider.send({
        recipient: 'invalid-phone-format',
        body: 'Test SMS',
      })
    ).rejects.toThrow(ProviderError);
  });

  it('3. Throws ProviderError when SMS body content is empty', async () => {
    await expect(
      mockSmsProvider.send({
        recipient: '+919999999999',
        body: '   ',
      })
    ).rejects.toThrow(ProviderError);
  });

  it('4. Simulates gateway failure when MOCK_SMS_MODE=failure', async () => {
    process.env.MOCK_SMS_MODE = 'failure';

    await expect(
      mockSmsProvider.send({
        recipient: '+919999999999',
        body: 'Test failure SMS',
      })
    ).rejects.toThrow('Mock SMS gateway delivery failed');
  });
});
