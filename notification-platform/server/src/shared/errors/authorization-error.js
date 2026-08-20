const AppError = require('./app-error');
const ErrorCodes = require('../constants/error-codes');

class AuthorizationError extends AppError {
  constructor(message = 'Access forbidden', details = null) {
    super(message, 403, ErrorCodes.FORBIDDEN, details);
  }
}

module.exports = AuthorizationError;
