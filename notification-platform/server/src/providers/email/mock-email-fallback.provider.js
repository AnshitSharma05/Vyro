const BaseNotificationProvider = require('../interfaces/notification-provider.interface');
const ProviderError = require('../../shared/errors/provider-error');
const logger = require('../../shared/utils/logger');

class MockEmailFallbackProvider extends BaseNotificationProvider {
  constructor() {
    super();
    this.name = 'mock-email-fallback';
  }

  async send({ recipient, subject, body, metadata = {} }) {
    if (!recipient || typeof recipient !== 'string') {
      throw new ProviderError('Recipient email is required for Fallback Email provider', 400);
    }

    if (process.env.MOCK_FALLBACK_MODE === 'failure') {
      logger.warn({ recipient }, '[MOCK EMAIL FALLBACK] Simulated fallback provider failure');
      throw new ProviderError('Mock Email Fallback Provider failure (Simulated Error)', 500);
    }

    const providerMessageId = `email_fb_msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    logger.info(
      { recipient, providerMessageId },
      '[MOCK EMAIL FALLBACK] Email dispatched successfully via fallback provider'
    );

    return {
      success: true,
      provider: this.name,
      providerMessageId,
      metadata: {
        channel: 'EMAIL',
        isFallback: true,
        sentAt: new Date().toISOString(),
      },
    };
  }
}

module.exports = MockEmailFallbackProvider;
