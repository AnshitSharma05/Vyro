const BaseNotificationProvider = require('../interfaces/notification-provider.interface');
const ProviderError = require('../../shared/errors/provider-error');
const logger = require('../../shared/utils/logger');

const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

class MockSmsProvider extends BaseNotificationProvider {
  constructor() {
    super();
    this.name = 'mock-sms';
  }

  /**
   * Simulates SMS delivery via mock gateway.
   *
   * @param {{ recipient: string, body: string, metadata?: Object }} payload
   * @returns {Promise<{ success: boolean, provider: string, providerMessageId: string, metadata?: Object }>}
   */
  async send({ recipient, body, metadata = {} }) {
    if (!recipient || typeof recipient !== 'string') {
      throw new ProviderError('Recipient phone number is required for SMS delivery', 400);
    }

    const sanitizedPhone = recipient.replace(/[\s-]/g, '');
    if (!PHONE_REGEX.test(sanitizedPhone)) {
      throw new ProviderError(`Invalid SMS phone number format: "${recipient}"`, 400);
    }

    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      throw new ProviderError('SMS body message content cannot be empty', 400);
    }

    // Support explicit mock failure mode for unit/integration testing
    if (process.env.MOCK_SMS_MODE === 'failure') {
      logger.warn({ recipient }, '[MOCK SMS PROVIDER] Simulated gateway delivery failure');
      throw new ProviderError('Mock SMS gateway delivery failed (Simulated Error)', 500);
    }

    const providerMessageId = `sms_msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    logger.info(
      { recipient: sanitizedPhone, providerMessageId, bodyLength: body.length },
      '[MOCK SMS PROVIDER] SMS dispatched successfully'
    );

    return {
      success: true,
      provider: this.name,
      providerMessageId,
      metadata: {
        channel: 'SMS',
        sentAt: new Date().toISOString(),
      },
    };
  }
}

module.exports = MockSmsProvider;
