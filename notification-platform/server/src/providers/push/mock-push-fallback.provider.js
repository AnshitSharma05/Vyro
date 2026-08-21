const BaseNotificationProvider = require('../interfaces/notification-provider.interface');
const ProviderError = require('../../shared/errors/provider-error');
const logger = require('../../shared/utils/logger');

class MockPushFallbackProvider extends BaseNotificationProvider {
  constructor() {
    super();
    this.name = 'mock-push-fallback';
  }

  async send({ recipient, subject, body, metadata = {} }) {
    if (!recipient || typeof recipient !== 'string' || recipient.trim().length === 0) {
      throw new ProviderError('Recipient device token is required for Fallback Push provider', 400);
    }

    if (process.env.MOCK_FALLBACK_MODE === 'failure') {
      logger.warn({ recipient }, '[MOCK PUSH FALLBACK] Simulated fallback provider failure');
      throw new ProviderError('Mock Push Fallback Provider failure (Simulated Error)', 500);
    }

    const providerMessageId = `push_fb_msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    logger.info(
      { recipient, providerMessageId },
      '[MOCK PUSH FALLBACK] Push notification dispatched successfully via fallback provider'
    );

    return {
      success: true,
      provider: this.name,
      providerMessageId,
      metadata: {
        channel: 'PUSH',
        isFallback: true,
        sentAt: new Date().toISOString(),
      },
    };
  }
}

module.exports = MockPushFallbackProvider;
