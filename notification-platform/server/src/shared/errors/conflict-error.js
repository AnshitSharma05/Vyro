const AppError = require('./app-error');
const ErrorCodes = require('../constants/error-codes');

class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details = null, errorCode = ErrorCodes.RESOURCE_EXISTS) {
    super(message, 409, errorCode, details);
  }
}

module.exports = ConflictError;
