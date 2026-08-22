const logger = require('../shared/utils/logger');
const AppError = require('../shared/errors/app-error');
const config = require('../config/env');

/**
 * Centralized production error handling middleware.
 */
function errorHandlerMiddleware(err, req, res, next) {
  const requestId = req.id || 'req_unknown';

  let statusCode = err.statusCode || err.status || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected internal server error occurred';
  let details = err.details || null;

  // Handle SyntaxError in JSON body parsing
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    code = 'INVALID_JSON_PAYLOAD';
    message = 'Malformed JSON request body';
  }

  // Handle Express CORS policy rejection errors
  if (err.message && err.message.startsWith('CORS policy violation')) {
    statusCode = 403;
    code = 'CORS_VIOLATION';
  }

  // Production Error Redaction: Hide stack traces & internal database errors
  const isProduction = config.NODE_ENV === 'production';
  if (isProduction && statusCode === 500) {
    message = 'An internal server error occurred. Please contact support with request ID.';
    details = null;
  }

  logger.error(
    {
      requestId,
      statusCode,
      code,
      path: req.originalUrl,
      method: req.method,
      error: err.message,
      stack: isProduction ? undefined : err.stack,
    },
    `[ERROR HANDLER] ${code}: ${err.message}`
  );

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      requestId,
      ...(details ? { details } : {}),
    },
  });
}

module.exports = errorHandlerMiddleware;
