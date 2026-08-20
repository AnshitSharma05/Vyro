const RETRYABLE_ERROR_CODES = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'ENOTFOUND',
  'ESOCKETTIMEDOUT',
  'SMTP_TIMEOUT',
  'TEMPORARY_FAILURE',
  'SERVER_BUSY',
  'RATE_LIMIT_EXCEEDED',
  'PROVIDER_TIMEOUT',
]);

const RETRYABLE_HTTP_STATUSES = new Set([429, 500, 502, 503, 504]);

/**
 * Classifies an error to determine whether it is retryable by BullMQ.
 *
 * @param {Error|Object} error
 * @returns {{ retryable: boolean, errorCode: string, message: string }}
 */
function classifyError(error) {
  if (!error) {
    return { retryable: false, errorCode: 'UNKNOWN_ERROR', message: 'An unknown error occurred' };
  }

  const message = error.message || 'Provider execution failure';
  const code = error.code || error.errorCode || 'DELIVERY_FAILED';

  // 1. Explicit retryable flag set on ProviderError or custom exception
  if (typeof error.retryable === 'boolean') {
    return {
      retryable: error.retryable,
      errorCode: code,
      message,
    };
  }

  // 2. Known retryable error codes
  if (RETRYABLE_ERROR_CODES.has(code)) {
    return {
      retryable: true,
      errorCode: code,
      message,
    };
  }

  // 3. Known retryable HTTP status codes
  if (error.statusCode && RETRYABLE_HTTP_STATUSES.has(error.statusCode)) {
    return {
      retryable: true,
      errorCode: code || `HTTP_${error.statusCode}`,
      message,
    };
  }

  // 4. Message content pattern matching for transient SMTP/network issues
  const lowerMsg = message.toLowerCase();
  if (
    lowerMsg.includes('timeout') ||
    lowerMsg.includes('timed out') ||
    lowerMsg.includes('connection reset') ||
    lowerMsg.includes('network error') ||
    lowerMsg.includes('temporary failure') ||
    lowerMsg.includes('try again')
  ) {
    return {
      retryable: true,
      errorCode: code !== 'DELIVERY_FAILED' ? code : 'SMTP_TIMEOUT',
      message,
    };
  }

  // 5. Default non-retryable for client errors, validation errors, and bad formatting
  return {
    retryable: false,
    errorCode: code,
    message,
  };
}

module.exports = {
  classifyError,
  RETRYABLE_ERROR_CODES,
};
