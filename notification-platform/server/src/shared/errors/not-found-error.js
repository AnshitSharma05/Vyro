const AppError = require('./app-error');
const ErrorCodes = require('../constants/error-codes');

class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details = null) {
    super(message, 404, ErrorCodes.NOT_FOUND, details);
  }
}

module.exports = NotFoundError;
