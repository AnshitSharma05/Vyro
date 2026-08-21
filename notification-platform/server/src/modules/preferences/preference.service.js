const preferenceRepository = require('./preference.repository');
const recipientService = require('../recipients/recipient.service');
const { NOTIFICATION_CATEGORIES, DEFAULT_PREFERENCES } = require('../../shared/notification/notification-categories');
const { CHANNELS } = require('../../shared/constants/channels');

class PreferenceService {
  async getPreferences(projectId, externalUserId) {
    const recipient = await recipientService.getRecipient(projectId, externalUserId);
    const storedPrefs = await preferenceRepository.findByRecipientId(recipient.id);

    // Format stored preferences merged over DEFAULT_PREFERENCES
    const result = {};
    const categories = Object.values(NOTIFICATION_CATEGORIES);
    const channels = Object.values(CHANNELS);

    for (const category of categories) {
      result[category] = {};
      for (const channel of channels) {
        const stored = storedPrefs.find((p) => p.category === category && p.channel === channel);
        if (stored !== undefined) {
          result[category][channel] = stored.enabled;
        } else {
          result[category][channel] = DEFAULT_PREFERENCES[category]?.[channel] ?? true;
        }
      }
    }

    return {
      externalUserId,
      preferences: result,
    };
  }

  async updatePreferences(projectId, externalUserId, preferencesMap) {
    const recipient = await recipientService.getRecipient(projectId, externalUserId);

    const preferencesList = [];
    for (const [category, channelsMap] of Object.entries(preferencesMap)) {
      if (NOTIFICATION_CATEGORIES[category]) {
        for (const [channel, enabled] of Object.entries(channelsMap)) {
          if (CHANNELS[channel] && typeof enabled === 'boolean') {
            preferencesList.push({ category, channel, enabled });
          }
        }
      }
    }

    if (preferencesList.length > 0) {
      await preferenceRepository.upsertBatch(recipient.id, preferencesList);
    }

    return this.getPreferences(projectId, externalUserId);
  }
}

module.exports = new PreferenceService();
