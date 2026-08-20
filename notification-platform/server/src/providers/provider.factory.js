const emailProvider = require('./email/email.provider');
const smsProvider = require('./sms/sms.provider');
const whatsappProvider = require('./whatsapp/whatsapp.provider');
const pushProvider = require('./push/push.provider');
const ProviderError = require('../shared/errors/provider-error');
const { CHANNELS } = require('../shared/constants/channels');

class ProviderFactory {
  constructor() {
    this.providers = {
      [CHANNELS.EMAIL]: emailProvider,
      [CHANNELS.SMS]: smsProvider,
      [CHANNELS.WHATSAPP]: whatsappProvider,
      [CHANNELS.PUSH]: pushProvider,
    };
  }

  /**
   * Retrieves the provider instance registered for the target channel.
   *
   * @param {string} channel
   * @returns {import('./interfaces/notification-provider.interface')}
   */
  getProvider(channel) {
    const provider = this.providers[channel];
    if (!provider) {
      throw new ProviderError(`No delivery provider configured for channel "${channel}"`, 422);
    }
    return provider;
  }
}

module.exports = new ProviderFactory();
