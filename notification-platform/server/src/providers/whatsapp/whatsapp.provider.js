const BaseNotificationProvider = require('../interfaces/notification-provider.interface');
const ProviderError = require('../../shared/errors/provider-error');

class WhatsappProvider extends BaseNotificationProvider {
  constructor() {
    super();
    this.name = 'WHATSAPP_PROVIDER';
  }

  async send({ recipient, body }) {
    throw new ProviderError('Delivery provider for WHATSAPP channel is not configured in Phase 6', 422);
  }
}

module.exports = new WhatsappProvider();
