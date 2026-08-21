const mockWhatsappProvider = require('../../src/providers/whatsapp/whatsapp.provider');
const ProviderError = require('../../src/shared/errors/provider-error');

describe('Mock WhatsApp Provider Unit Tests', () => {
  const originalMode = process.env.MOCK_WHATSAPP_MODE;

  afterEach(() => {
    process.env.MOCK_WHATSAPP_MODE = originalMode;
  });

  it('1. Returns normalized success result for valid recipient phone and message body', async () => {
    const result = await mockWhatsappProvider.send({
      recipient: '+919876543210',
      body: 'Your order ORD-999 has been confirmed!',
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe('mock-whatsapp');
    expect(result.providerMessageId).toMatch(/^wa_msg_/);
    expect(result.metadata.channel).toBe('WHATSAPP');
  });

  it('2. Throws ProviderError when phone format is invalid', async () => {
    await expect(
      mockWhatsappProvider.send({
        recipient: 'bad-phone',
        body: 'WhatsApp message',
      })
    ).rejects.toThrow(ProviderError);
  });

  it('3. Throws ProviderError when message body is empty', async () => {
    await expect(
      mockWhatsappProvider.send({
        recipient: '+919876543210',
        body: '',
      })
    ).rejects.toThrow(ProviderError);
  });
});
