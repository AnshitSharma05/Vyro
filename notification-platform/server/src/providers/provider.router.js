const emailProvider = require('./email/email.provider');
const MockEmailFallbackProvider = require('./email/mock-email-fallback.provider');
const smsProvider = require('./sms/sms.provider');
const MockSmsFallbackProvider = require('./sms/mock-sms-fallback.provider');
const whatsappProvider = require('./whatsapp/whatsapp.provider');
const MockWhatsappFallbackProvider = require('./whatsapp/mock-whatsapp-fallback.provider');
const pushProvider = require('./push/push.provider');
const MockPushFallbackProvider = require('./push/mock-push-fallback.provider');

const providerFailoverPolicy = require('./provider.failover-policy');
const ProviderError = require('../shared/errors/provider-error');
const { classifyError } = require('../shared/utils/error-classifier');
const logger = require('../shared/utils/logger');
const { CHANNELS } = require('../shared/constants/channels');

class ProviderRouter {
  constructor() {
    this.routes = {
      [CHANNELS.EMAIL]: {
        primary: emailProvider,
        fallback: new MockEmailFallbackProvider(),
      },
      [CHANNELS.SMS]: {
        primary: smsProvider,
        fallback: new MockSmsFallbackProvider(),
      },
      [CHANNELS.WHATSAPP]: {
        primary: whatsappProvider,
        fallback: new MockWhatsappFallbackProvider(),
      },
      [CHANNELS.PUSH]: {
        primary: pushProvider,
        fallback: new MockPushFallbackProvider(),
      },
    };
  }

  /**
   * Resolves primary and fallback provider instances for target channel.
   */
  getChannelRoute(channel) {
    const route = this.routes[channel];
    if (!route || !route.primary) {
      throw new ProviderError(`No delivery provider configured for channel "${channel}"`, 422);
    }
    return route;
  }

  /**
   * Orchestrates primary -> fallback provider execution sequence with detailed attempt telemetry.
   *
   * @param {{ channel: string, recipient: string, subject?: string, body: string, metadata?: Object }} payload
   * @returns {Promise<{ success: boolean, provider: string, result?: Object, error?: Error, attempts: Array, failoverTriggered: boolean }>}
   */
  async sendNotificationWithFailover({ channel, recipient, subject, body, metadata = {} }) {
    const route = this.getChannelRoute(channel);
    const primary = route.primary;
    const fallback = route.fallback;

    const attempts = [];
    let failoverTriggered = false;

    // 1. Attempt Primary Provider
    try {
      const result = await primary.send({ recipient, subject, body, metadata });
      attempts.push({
        provider: primary.name || 'primary',
        status: 'SUCCESS',
        attemptReason: 'PRIMARY',
        result,
      });

      return {
        success: true,
        provider: result.provider || primary.name,
        result,
        attempts,
        failoverTriggered: false,
      };
    } catch (primaryErr) {
      const classified = classifyError(primaryErr);
      attempts.push({
        provider: primary.name || 'primary',
        status: 'FAILED',
        attemptReason: 'PRIMARY',
        errorCode: classified.errorCode,
        errorMessage: classified.message,
        error: primaryErr,
      });

      // 2. Check if error is eligible for fallback provider execution
      const isEligible = providerFailoverPolicy.isFailoverEligible(primaryErr);

      if (!isEligible || !fallback) {
        logger.warn(
          { channel, provider: primary.name, errorCode: classified.errorCode, isEligible },
          '[PROVIDER ROUTER] Primary provider failed with non-failover-eligible error. Skipping fallback.'
        );
        return {
          success: false,
          provider: primary.name,
          error: primaryErr,
          attempts,
          failoverTriggered: false,
        };
      }

      // 3. Execute Fallback Provider
      failoverTriggered = true;
      logger.warn(
        { channel, primary: primary.name, fallback: fallback.name, primaryError: classified.message },
        '[PROVIDER ROUTER] Primary provider failed. Triggering Fallback provider execution.'
      );

      try {
        const fallbackResult = await fallback.send({ recipient, subject, body, metadata });
        attempts.push({
          provider: fallback.name || 'fallback',
          status: 'SUCCESS',
          attemptReason: 'FAILOVER',
          result: fallbackResult,
        });

        logger.info(
          { channel, fallback: fallback.name },
          '[PROVIDER ROUTER] Fallback provider succeeded after primary failure'
        );

        return {
          success: true,
          provider: fallbackResult.provider || fallback.name,
          result: fallbackResult,
          attempts,
          failoverTriggered: true,
        };
      } catch (fallbackErr) {
        const fallbackClassified = classifyError(fallbackErr);
        attempts.push({
          provider: fallback.name || 'fallback',
          status: 'FAILED',
          attemptReason: 'FAILOVER',
          errorCode: fallbackClassified.errorCode,
          errorMessage: fallbackClassified.message,
          error: fallbackErr,
        });

        logger.error(
          { channel, primary: primary.name, fallback: fallback.name, fallbackError: fallbackClassified.message },
          '[PROVIDER ROUTER] Both Primary and Fallback providers failed'
        );

        return {
          success: false,
          provider: fallback.name,
          error: fallbackErr,
          attempts,
          failoverTriggered: true,
        };
      }
    }
  }
}

module.exports = new ProviderRouter();
