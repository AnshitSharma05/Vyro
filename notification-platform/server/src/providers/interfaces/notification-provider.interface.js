/**
 * Abstract Base Notification Provider Interface
 */
class BaseNotificationProvider {
  /**
   * Sends a notification payload via the underlying transport.
   *
   * @param {{ recipient: string, subject?: string|null, body: string, metadata?: Object }} payload
   * @returns {Promise<{ success: boolean, messageId?: string, provider: string }>}
   */
  async send(payload) {
    throw new Error('Provider method send() must be implemented by subclass');
  }
}

module.exports = BaseNotificationProvider;
