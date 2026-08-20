const AppError = require('./app-error');
const ErrorCodes = require('../constants/error-codes');

class ConflictError extends AppError {
  constructor(message = 'Resource already exists', details = null) {
    super(message, 409, ErrorCodes.RESOURCE_EXISTS, details);
  }
}

module.exports = ConflictError;
