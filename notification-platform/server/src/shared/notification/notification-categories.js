const NOTIFICATION_CATEGORIES = Object.freeze({
  TRANSACTIONAL: 'TRANSACTIONAL',
  SECURITY: 'SECURITY',
  MARKETING: 'MARKETING',
  SYSTEM: 'SYSTEM',
});

const DEFAULT_PREFERENCES = Object.freeze({
  TRANSACTIONAL: {
    EMAIL: true,
    SMS: true,
    WHATSAPP: true,
    PUSH: true,
  },
  SECURITY: {
    EMAIL: true,
    SMS: true,
    WHATSAPP: true,
    PUSH: true,
  },
  SYSTEM: {
    EMAIL: true,
    SMS: false,
    WHATSAPP: false,
    PUSH: true,
  },
  MARKETING: {
    EMAIL: false,
    SMS: false,
    WHATSAPP: false,
    PUSH: false,
  },
});

module.exports = {
  NOTIFICATION_CATEGORIES,
  VALID_CATEGORIES: Object.values(NOTIFICATION_CATEGORIES),
  DEFAULT_PREFERENCES,
};
