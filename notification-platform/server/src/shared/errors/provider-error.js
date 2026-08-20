const AppError = require('./app-error');
const ErrorCodes = require('../constants/error-codes');

class ProviderError extends AppError {
  constructor(message = 'Provider delivery failed', statusCode = 422, details = null, retryable = false) {
    super(message, statusCode, ErrorCodes.PROVIDER_ERROR, details);
    this.retryable = retryable;
  }
}

module.exports = ProviderError;
