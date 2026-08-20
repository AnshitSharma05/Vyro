const AppError = require('../shared/errors/app-error');
const ApiResponse = require('../shared/utils/api-response');
const logger = require('../shared/logger/logger');
const config = require('../config/env');

const errorHandler = (err, req, res, next) => {
  let { statusCode, message, errorCode, details } = err;

  if (!(err instanceof AppError)) {
    statusCode = 500;
    message = config.NODE_ENV === 'production' ? 'Internal server error' : err.message;
    errorCode = 'INTERNAL_SERVER_ERROR';
    details = null;
    logger.error(err, 'Unhandled Error Exception');
  } else {
    logger.warn({ statusCode, errorCode, message, details }, 'Operational AppError Handled');
  }

  return ApiResponse.error(res, message, statusCode, errorCode, details);
};

module.exports = errorHandler;
