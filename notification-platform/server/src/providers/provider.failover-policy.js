const { classifyError } = require('../shared/utils/error-classifier');

const NON_FAILOVER_CODES = new Set([
  'INVALID_RECIPIENT',
  'INVALID_RECIPIENT_EMAIL',
  'INVALID_RECIPIENT_PHONE',
  'INVALID_DEVICE_TOKEN',
  'INVALID_PAYLOAD',
  'TEMPLATE_CHANNEL_MISMATCH',
  'TEMPLATE_NOT_FOUND',
]);

class ProviderFailoverPolicy {
  /**
   * Determines if a provider execution error is eligible for fallback provider execution.
   *
   * @param {Error|Object} error
   * @returns {boolean}
   */
  isFailoverEligible(error) {
    if (!error) return false;

    // Use error classifier to inspect code and retryability
    const classified = classifyError(error);

    if (NON_FAILOVER_CODES.has(classified.errorCode)) {
      return false;
    }

    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      // 4xx errors except 429 rate limits are client errors, not provider outages
      if (error.statusCode !== 429) {
        return false;
      }
    }

    return classified.retryable || classified.errorCode === 'PROVIDER_UNAVAILABLE' || classified.errorCode === 'AUTHENTICATION_ERROR';
  }
}

module.exports = new ProviderFailoverPolicy();
