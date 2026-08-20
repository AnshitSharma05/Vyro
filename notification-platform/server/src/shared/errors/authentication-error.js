const AppError = require('./app-error');
const ErrorCodes = require('../constants/error-codes');

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed', details = null) {
    super(message, 401, ErrorCodes.AUTHENTICATION_FAILED, details);
  }
}

module.exports = AuthenticationError;
