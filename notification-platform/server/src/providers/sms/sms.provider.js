const BaseNotificationProvider = require('../interfaces/notification-provider.interface');
const ProviderError = require('../../shared/errors/provider-error');

class SmsProvider extends BaseNotificationProvider {
  constructor() {
    super();
    this.name = 'SMS_PROVIDER';
  }

  async send({ recipient, body }) {
    throw new ProviderError('Delivery provider for SMS channel is not configured in Phase 6', 422);
  }
}

module.exports = new SmsProvider();
