const AuthorizationError = require('../shared/errors/authorization-error');
const asyncHandler = require('../shared/utils/async-handler');

/**
 * Middleware factory enforcing Machine API Key scope for machine-to-machine endpoints.
 *
 * @param {string} requiredScope
 */
const requireScope = (requiredScope) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.apiKey && !req.project) {
      throw new AuthorizationError('Machine API Key authentication required');
    }

    const keyScopes = req.apiKey?.scopes || [];

    // If key has defined scopes, enforce that requiredScope is present
    if (keyScopes.length > 0) {
      const hasAccess =
        keyScopes.includes('*') ||
        keyScopes.includes(requiredScope) ||
        (requiredScope === 'notifications:send' && keyScopes.includes('notifications:write')) ||
        (requiredScope === 'notifications:write' && keyScopes.includes('notifications:send'));

      if (!hasAccess) {
        throw new AuthorizationError(
          `The API key does not have the required scope: "${requiredScope}"`
        );
      }
    }

    next();
  });
};

module.exports = {
  requireScope,
};
