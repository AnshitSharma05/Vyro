const API_KEY_SCOPES = Object.freeze({
  NOTIFICATIONS_SEND: 'notifications:send',
  NOTIFICATIONS_READ: 'notifications:read',
  NOTIFICATIONS_CANCEL: 'notifications:cancel',
  TEMPLATES_READ: 'templates:read',
  TEMPLATES_WRITE: 'templates:write',
  ANALYTICS_READ: 'analytics:read',
  WEBHOOKS_READ: 'webhooks:read',
  WEBHOOKS_WRITE: 'webhooks:write',
  API_KEYS_READ: 'api_keys:read',
  RECIPIENTS_READ: 'recipients:read',
  RECIPIENTS_WRITE: 'recipients:write',
  PREFERENCES_READ: 'preferences:read',
  PREFERENCES_WRITE: 'preferences:write',
  DEVICES_READ: 'devices:read',
  DEVICES_WRITE: 'devices:write',
});

const VALID_SCOPES_SET = new Set(Object.values(API_KEY_SCOPES));

/**
 * Validates an array of scope strings.
 *
 * @param {Array<string>} scopes
 * @returns {{ valid: boolean, invalidScopes: Array<string> }}
 */
function validateScopes(scopes = []) {
  if (!Array.isArray(scopes)) {
    return { valid: false, invalidScopes: ['Scopes must be an array'] };
  }

  const invalidScopes = scopes.filter((scope) => !VALID_SCOPES_SET.has(scope));
  return {
    valid: invalidScopes.length === 0,
    invalidScopes,
  };
}

module.exports = {
  API_KEY_SCOPES,
  VALID_SCOPES: Object.values(API_KEY_SCOPES),
  validateScopes,
};
