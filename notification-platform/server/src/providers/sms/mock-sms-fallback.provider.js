const BaseNotificationProvider = require('../interfaces/notification-provider.interface');
const ProviderError = require('../../shared/errors/provider-error');
const logger = require('../../shared/utils/logger');

const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

class MockSmsFallbackProvider extends BaseNotificationProvider {
  constructor() {
    super();
    this.name = 'mock-sms-fallback';
  }

  async send({ recipient, body, metadata = {} }) {
    if (!recipient || typeof recipient !== 'string') {
      throw new ProviderError('Recipient phone is required for Fallback SMS provider', 400);
    }

    const sanitizedPhone = recipient.replace(/[\s-]/g, '');
    if (!PHONE_REGEX.test(sanitizedPhone)) {
      throw new ProviderError(`Invalid SMS phone number format: "${recipient}"`, 400);
    }

    if (process.env.MOCK_FALLBACK_MODE === 'failure') {
      logger.warn({ recipient }, '[MOCK SMS FALLBACK] Simulated fallback provider failure');
      throw new ProviderError('Mock SMS Fallback Provider failure (Simulated Error)', 500);
    }

    const providerMessageId = `sms_fb_msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    logger.info(
      { recipient: sanitizedPhone, providerMessageId },
      '[MOCK SMS FALLBACK] SMS dispatched successfully via fallback provider'
    );

    return {
      success: true,
      provider: this.name,
      providerMessageId,
      metadata: {
        channel: 'SMS',
        isFallback: true,
        sentAt: new Date().toISOString(),
      },
    };
  }
}

module.exports = MockSmsFallbackProvider;
