const recipientRepository = require('./recipient.repository');
const NotFoundError = require('../../shared/errors/not-found-error');
const ConflictError = require('../../shared/errors/conflict-error');

class RecipientService {
  async createRecipient({ projectId, externalUserId, email, phone }) {
    const existing = await recipientRepository.findByExternalUserId(projectId, externalUserId);
    if (existing) {
      throw new ConflictError(`Recipient with externalUserId "${externalUserId}" already exists in project`);
    }

    return recipientRepository.create({
      projectId,
      externalUserId,
      email,
      phone,
    });
  }

  async getOrCreateRecipient({ projectId, externalUserId, email, phone }) {
    let recipient = await recipientRepository.findByExternalUserId(projectId, externalUserId);
    if (!recipient) {
      recipient = await recipientRepository.create({
        projectId,
        externalUserId,
        email,
        phone,
      });
    } else if ((email && !recipient.email) || (phone && !recipient.phone)) {
      recipient = await recipientRepository.update(recipient.id, {
        email: email || recipient.email,
        phone: phone || recipient.phone,
      });
    }
    return recipient;
  }

  async getRecipient(projectId, externalUserId) {
    const recipient = await recipientRepository.findByExternalUserId(projectId, externalUserId);
    if (!recipient) {
      throw new NotFoundError(`Recipient "${externalUserId}" not found`);
    }
    return recipient;
  }

  async updateRecipient(projectId, externalUserId, { email, phone }) {
    const recipient = await this.getRecipient(projectId, externalUserId);
    return recipientRepository.update(recipient.id, { email, phone });
  }

  async listRecipients(projectId, pagination) {
    return recipientRepository.findByProjectId(projectId, pagination);
  }
}

module.exports = new RecipientService();
