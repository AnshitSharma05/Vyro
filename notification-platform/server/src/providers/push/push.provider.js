const BaseNotificationProvider = require('../interfaces/notification-provider.interface');
const ProviderError = require('../../shared/errors/provider-error');

class PushProvider extends BaseNotificationProvider {
  constructor() {
    super();
    this.name = 'PUSH_PROVIDER';
  }

  async send({ recipient, body }) {
    throw new ProviderError('Delivery provider for PUSH channel is not configured in Phase 6', 422);
  }
}

module.exports = new PushProvider();
