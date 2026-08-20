const AppError = require('./app-error');
const ErrorCodes = require('../constants/error-codes');

class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 400, ErrorCodes.VALIDATION_ERROR, details);
  }
}

module.exports = ValidationError;
