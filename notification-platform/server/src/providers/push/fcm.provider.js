const BaseNotificationProvider = require('../interfaces/notification-provider.interface');
const ProviderError = require('../../shared/errors/provider-error');
const { getMessagingClient } = require('./firebase.client');
const logger = require('../../shared/utils/logger');

class FcmPushProvider extends BaseNotificationProvider {
  constructor() {
    super();
    this.name = 'fcm';
  }

  /**
   * Dispatches push notification via Firebase Cloud Messaging (FCM).
   *
   * @param {{ recipient: string, subject?: string, body: string, metadata?: Object }} payload
   * @returns {Promise<{ success: boolean, provider: string, providerMessageId: string, metadata?: Object }>}
   */
  async send({ recipient, subject, body, metadata = {} }) {
    if (!recipient || typeof recipient !== 'string' || recipient.trim().length === 0) {
      throw new ProviderError('Recipient device token is required for Push notification delivery', 400);
    }

    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      throw new ProviderError('Push notification body message content cannot be empty', 400);
    }

    try {
      const messaging = getMessagingClient();

      const messagePayload = {
        token: recipient,
        notification: {
          title: subject || 'New Notification',
          body: body,
        },
        data: metadata.data ? Object.fromEntries(Object.entries(metadata.data).map(([k, v]) => [k, String(v)])) : {},
      };

      const response = await messaging.send(messagePayload);
      const providerMessageId = typeof response === 'string' ? response : `fcm_msg_${Date.now()}`;

      logger.info(
        { recipient, providerMessageId },
        '[FCM PUSH PROVIDER] Push notification dispatched successfully via FCM'
      );

      return {
        success: true,
        provider: this.name,
        providerMessageId,
        metadata: {
          channel: 'PUSH',
          sentAt: new Date().toISOString(),
        },
      };
    } catch (err) {
      logger.error({ err: err.message, recipient }, '[FCM PUSH PROVIDER] Push delivery failed');
      throw new ProviderError(`FCM Push delivery failed: ${err.message}`, 500);
    }
  }
}

module.exports = FcmPushProvider;
