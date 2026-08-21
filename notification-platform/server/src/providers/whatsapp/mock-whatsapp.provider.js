const BaseNotificationProvider = require('../interfaces/notification-provider.interface');
const ProviderError = require('../../shared/errors/provider-error');
const logger = require('../../shared/utils/logger');

const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

class MockWhatsappProvider extends BaseNotificationProvider {
  constructor() {
    super();
    this.name = 'mock-whatsapp';
  }

  /**
   * Simulates WhatsApp Cloud API message delivery.
   *
   * @param {{ recipient: string, body: string, metadata?: Object }} payload
   * @returns {Promise<{ success: boolean, provider: string, providerMessageId: string, metadata?: Object }>}
   */
  async send({ recipient, body, metadata = {} }) {
    if (!recipient || typeof recipient !== 'string') {
      throw new ProviderError('Recipient phone number is required for WhatsApp delivery', 400);
    }

    const sanitizedPhone = recipient.replace(/[\s-]/g, '');
    if (!PHONE_REGEX.test(sanitizedPhone)) {
      throw new ProviderError(`Invalid WhatsApp phone number format: "${recipient}"`, 400);
    }

    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      throw new ProviderError('WhatsApp message content cannot be empty', 400);
    }

    // Support explicit mock failure mode for testing
    if (process.env.MOCK_WHATSAPP_MODE === 'failure') {
      logger.warn({ recipient }, '[MOCK WHATSAPP PROVIDER] Simulated Cloud API delivery failure');
      throw new ProviderError('Mock WhatsApp Cloud API delivery failed (Simulated Error)', 500);
    }

    const providerMessageId = `wa_msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    logger.info(
      { recipient: sanitizedPhone, providerMessageId, bodyLength: body.length },
      '[MOCK WHATSAPP PROVIDER] WhatsApp message dispatched successfully'
    );

    return {
      success: true,
      provider: this.name,
      providerMessageId,
      metadata: {
        channel: 'WHATSAPP',
        sentAt: new Date().toISOString(),
      },
    };
  }
}

module.exports = MockWhatsappProvider;
