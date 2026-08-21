/**
 * Base error class for all Notification Platform SDK errors.
 */
class NotificationPlatformError extends Error {
  constructor(message, { statusCode = null, code = 'SDK_ERROR', requestId = null, details = null } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Thrown on HTTP 400 Validation Errors.
 */
class ValidationError extends NotificationPlatformError {
  constructor(message, options = {}) {
    super(message, { statusCode: 400, code: 'VALIDATION_ERROR', ...options });
  }
}

/**
 * Thrown on HTTP 401 Authentication Failures (Invalid or missing API key).
 */
class AuthenticationError extends NotificationPlatformError {
  constructor(message, options = {}) {
    super(message, { statusCode: 401, code: 'AUTHENTICATION_FAILED', ...options });
  }
}

/**
 * Thrown on HTTP 403 Authorization Failures (Insufficient API key scope).
 */
class AuthorizationError extends NotificationPlatformError {
  constructor(message, options = {}) {
    super(message, { statusCode: 403, code: 'INSUFFICIENT_SCOPE', ...options });
  }
}

/**
 * Thrown on HTTP 404 Resource Not Found.
 */
class NotFoundError extends NotificationPlatformError {
  constructor(message, options = {}) {
    super(message, { statusCode: 404, code: 'NOT_FOUND', ...options });
  }
}

/**
 * Thrown on HTTP 409 Resource Conflict or Idempotency Re-use Mismatch.
 */
class ConflictError extends NotificationPlatformError {
  constructor(message, options = {}) {
    super(message, { statusCode: 409, code: 'CONFLICT', ...options });
  }
}

/**
 * Thrown on HTTP 429 Rate Limit Exceeded.
 */
class RateLimitError extends NotificationPlatformError {
  constructor(message, { retryAfter = null, ...options } = {}) {
    super(message, { statusCode: 429, code: 'RATE_LIMIT_EXCEEDED', ...options });
    this.retryAfter = retryAfter;
  }
}

/**
 * Thrown on HTTP 5xx Server Errors.
 */
class ServerError extends NotificationPlatformError {
  constructor(message, options = {}) {
    super(message, { statusCode: options.statusCode || 500, code: 'INTERNAL_SERVER_ERROR', ...options });
  }
}

/**
 * Thrown when an HTTP request exceeds the configured timeout threshold.
 */
class TimeoutError extends NotificationPlatformError {
  constructor(message = 'Request timed out', options = {}) {
    super(message, { statusCode: null, code: 'REQUEST_TIMEOUT', ...options });
  }
}

/**
 * Thrown when network connectivity fails.
 */
class NetworkError extends NotificationPlatformError {
  constructor(message = 'Network connection failure', options = {}) {
    super(message, { statusCode: null, code: 'NETWORK_ERROR', ...options });
  }
}

module.exports = {
  NotificationPlatformError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError,
  TimeoutError,
  NetworkError,
};
