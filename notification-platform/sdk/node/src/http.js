const {
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
} = require('./errors');

class HttpClient {
  constructor({
    apiKey,
    baseURL = 'http://localhost:5000/api/v1',
    timeout = 10000,
    maxRetries = 3,
    debug = false,
  } = {}) {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      throw new ValidationError('API key is required to initialize NotificationClient');
    }

    this.apiKey = apiKey.trim();
    this.baseURL = baseURL.replace(/\/+$/, '');
    this.timeout = timeout;
    this.maxRetries = maxRetries;
    this.debug = debug;
  }

  logDebug(message, metadata = {}) {
    if (this.debug) {
      const sanitized = { ...metadata };
      if (sanitized.headers && sanitized.headers['X-API-Key']) {
        sanitized.headers = { ...sanitized.headers, 'X-API-Key': '[REDACTED]' };
      }
      console.log(`[NotificationSDK] ${message}`, JSON.stringify(sanitized));
    }
  }

  async request(method, path, body = null, options = {}) {
    const url = `${this.baseURL}${path.startsWith('/') ? path : `/${path}`}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      ...options.headers,
    };

    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    const idempotencyKeyPresent = Boolean(
      options.idempotencyKey || (body && (body.idempotencyKey || body.externalEventId))
    );

    const isSafeMethod = method === 'GET' || method === 'DELETE' || method === 'PUT' || method === 'PATCH';
    const isRetryableMethod = isSafeMethod || (method === 'POST' && idempotencyKeyPresent);

    let attempt = 0;
    while (attempt <= this.maxRetries) {
      attempt++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.timeout);

      this.logDebug(`Executing HTTP ${method} ${url} (Attempt ${attempt})`, { method, url, headers });

      try {
        const fetchOptions = {
          method,
          headers,
          signal: controller.signal,
        };

        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
          fetchOptions.body = JSON.stringify(body);
        }

        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);

        const requestId = response.headers.get('x-request-id') || response.headers.get('request-id') || null;

        if (response.ok) {
          const json = await response.json();
          this.logDebug(`HTTP ${response.status} Success`, { status: response.status, requestId });
          return json.data !== undefined ? json.data : json;
        }

        // Parse error payload from backend API
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (_) {}

        const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status} Error`;
        const errorCode = errorData.error?.code || errorData.code || 'API_ERROR';
        const details = errorData.error?.details || errorData.details || null;

        const isTransient = response.status === 429 || response.status >= 502;
        if (isTransient && isRetryableMethod && attempt <= this.maxRetries) {
          let retryDelay = 200 * Math.pow(2, attempt) + Math.floor(Math.random() * 50);
          if (response.status === 429) {
            const retryAfterHeader = response.headers.get('retry-after');
            if (retryAfterHeader) {
              const seconds = parseInt(retryAfterHeader, 10);
              if (!isNaN(seconds)) retryDelay = seconds * 1000;
            }
          }
          this.logDebug(`Transient status ${response.status}. Retrying in ${retryDelay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }

        // Throw normalized SDK error
        this.normalizeAndThrowError(response.status, errorMessage, { code: errorCode, requestId, details, responseHeaders: response.headers });

      } catch (err) {
        clearTimeout(timeoutId);

        if (err instanceof NotificationPlatformError) {
          throw err;
        }

        const isAbort = err.name === 'AbortError';
        const isNetworkErr = err.name === 'TypeError' || isAbort;

        if (isNetworkErr && isRetryableMethod && attempt <= this.maxRetries) {
          const retryDelay = 200 * Math.pow(2, attempt) + Math.floor(Math.random() * 50);
          this.logDebug(`Network/Timeout error. Retrying in ${retryDelay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }

        if (isAbort) {
          throw new TimeoutError(`Request to ${path} timed out after ${options.timeout || this.timeout}ms`);
        }
        throw new NetworkError(err.message || 'Failed to connect to Notification Platform API');
      }
    }
  }

  normalizeAndThrowError(status, message, { code, requestId, details, responseHeaders }) {
    switch (status) {
      case 400:
        throw new ValidationError(message, { code, requestId, details });
      case 401:
        throw new AuthenticationError(message, { code, requestId, details });
      case 403:
        throw new AuthorizationError(message, { code, requestId, details });
      case 404:
        throw new NotFoundError(message, { code, requestId, details });
      case 409:
        throw new ConflictError(message, { code, requestId, details });
      case 429: {
        const retryAfter = responseHeaders ? responseHeaders.get('retry-after') : null;
        throw new RateLimitError(message, { code, requestId, details, retryAfter });
      }
      default:
        throw new ServerError(message, { statusCode: status, code, requestId, details });
    }
  }
}

module.exports = HttpClient;
