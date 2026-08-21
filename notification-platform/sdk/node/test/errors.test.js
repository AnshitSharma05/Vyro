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
} = require('../src/errors');

describe('SDK Error Hierarchy Unit Tests (PHASE 20)', () => {
  it('1. RateLimitError exposes statusCode 429 and retryAfter header value', () => {
    const err = new RateLimitError('Rate limit exceeded', { retryAfter: '30', requestId: 'req-123' });

    expect(err).toBeInstanceOf(NotificationPlatformError);
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(err.retryAfter).toBe('30');
    expect(err.requestId).toBe('req-123');
  });

  it('2. AuthenticationError exposes statusCode 401', () => {
    const err = new AuthenticationError('Invalid API Key');
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('AUTHENTICATION_FAILED');
  });

  it('3. ValidationError exposes statusCode 400 and validation details', () => {
    const details = [{ field: 'template', issue: 'Required' }];
    const err = new ValidationError('Invalid request payload', { details });

    expect(err.statusCode).toBe(400);
    expect(err.details).toEqual(details);
  });
});
