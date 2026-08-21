const { NOTIFICATION_CATEGORIES, DEFAULT_PREFERENCES } = require('./notification-categories');
const { SUPPRESSION_REASONS } = require('./suppression-reasons');

class DeliveryPolicyService {
  /**
   * Evaluates system rules, category policy, recipient preferences, and device status.
   *
   * @param {{
   *   category?: string,
   *   channel: string,
   *   recipientEmail?: string|null,
   *   recipientPhone?: string|null,
   *   recipientPreferences?: Array<{ category: string, channel: string, enabled: boolean }>,
   *   activeDevicesCount?: number,
   *   isDirectRecipient?: boolean
   * }} params
   * @returns {{ allowed: boolean, reason: string|null }}
   */
  evaluateDelivery({
    category = NOTIFICATION_CATEGORIES.TRANSACTIONAL,
    channel,
    recipientEmail = null,
    recipientPhone = null,
    recipientPreferences = [],
    activeDevicesCount = 0,
    isDirectRecipient = false,
  }) {
    const targetCategory = category || NOTIFICATION_CATEGORIES.TRANSACTIONAL;

    // 1. Critical Category Rule: SECURITY notifications cannot be suppressed by user preference
    if (targetCategory === NOTIFICATION_CATEGORIES.SECURITY) {
      return { allowed: true, reason: null };
    }

    // 2. Validate Contact Details
    if (channel === 'EMAIL' && !isDirectRecipient && !recipientEmail) {
      return { allowed: false, reason: SUPPRESSION_REASONS.NO_VALID_RECIPIENT };
    }

    if ((channel === 'SMS' || channel === 'WHATSAPP') && !isDirectRecipient && !recipientPhone) {
      return { allowed: false, reason: SUPPRESSION_REASONS.NO_VALID_RECIPIENT };
    }

    // 3. Validate PUSH Devices
    if (channel === 'PUSH' && !isDirectRecipient && activeDevicesCount === 0) {
      return { allowed: false, reason: SUPPRESSION_REASONS.NO_ACTIVE_DEVICE };
    }

    // Direct recipient mode (legacy email/phone string) uses default system preferences
    if (isDirectRecipient) {
      const defaultPref = DEFAULT_PREFERENCES[targetCategory]?.[channel];
      if (defaultPref === false) {
        return { allowed: false, reason: SUPPRESSION_REASONS.USER_PREFERENCE };
      }
      return { allowed: true, reason: null };
    }

    // 4. Evaluate User Preference
    const explicitPref = recipientPreferences.find(
      (p) => p.category === targetCategory && p.channel === channel
    );

    if (explicitPref !== undefined) {
      if (!explicitPref.enabled) {
        return { allowed: false, reason: SUPPRESSION_REASONS.USER_PREFERENCE };
      }
      return { allowed: true, reason: null };
    }

    // Fall back to Category Defaults
    const defaultEnabled = DEFAULT_PREFERENCES[targetCategory]?.[channel];
    if (defaultEnabled === false) {
      return { allowed: false, reason: SUPPRESSION_REASONS.USER_PREFERENCE };
    }

    return { allowed: true, reason: null };
  }
}

module.exports = new DeliveryPolicyService();
