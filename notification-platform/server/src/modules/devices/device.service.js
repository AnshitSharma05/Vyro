const deviceRepository = require('./device.repository');
const recipientService = require('../recipients/recipient.service');
const NotFoundError = require('../../shared/errors/not-found-error');

class DeviceService {
  async registerDevice(projectId, externalUserId, { token, platform }) {
    const recipient = await recipientService.getRecipient(projectId, externalUserId);
    return deviceRepository.upsertDevice({
      recipientId: recipient.id,
      token,
      platform: platform || 'WEB',
    });
  }

  async listDevices(projectId, externalUserId) {
    const recipient = await recipientService.getRecipient(projectId, externalUserId);
    return deviceRepository.findActiveByRecipientId(recipient.id);
  }

  async deactivateDevice(projectId, externalUserId, deviceId) {
    const recipient = await recipientService.getRecipient(projectId, externalUserId);
    const device = await deviceRepository.findById(deviceId);

    if (!device || device.recipientId !== recipient.id) {
      throw new NotFoundError(`Device "${deviceId}" not found for recipient`);
    }

    return deviceRepository.deactivateDevice(deviceId);
  }

  async deactivateToken(recipientId, token) {
    return deviceRepository.deactivateByToken(recipientId, token);
  }
}

module.exports = new DeviceService();
