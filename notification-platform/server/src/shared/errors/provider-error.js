const AppError = require('./app-error');
const ErrorCodes = require('../constants/error-codes');

class ProviderError extends AppError {
  constructor(message = 'Provider delivery failed', statusCode = 422, details = null) {
    super(message, statusCode, ErrorCodes.PROVIDER_ERROR, details);
  }
}

module.exports = ProviderError;
