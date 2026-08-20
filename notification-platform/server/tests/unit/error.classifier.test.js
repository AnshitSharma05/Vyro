const { classifyError } = require('../../src/shared/utils/error-classifier');
const ProviderError = require('../../src/shared/errors/provider-error');

describe('Error Classifier Utility Unit Tests', () => {
  it('classifies network timeout (ETIMEDOUT, SMTP_TIMEOUT) as retryable', () => {
    const err = new Error('Connection timed out');
    err.code = 'ETIMEDOUT';

    const result = classifyError(err);
    expect(result.retryable).toBe(true);
    expect(result.errorCode).toBe('ETIMEDOUT');
  });

  it('classifies connection reset (ECONNRESET) as retryable', () => {
    const err = new Error('read ECONNRESET');
    err.code = 'ECONNRESET';

    const result = classifyError(err);
    expect(result.retryable).toBe(true);
  });

  it('classifies HTTP 503 Gateway Unavailable as retryable', () => {
    const err = new Error('Service Unavailable');
    err.statusCode = 503;

    const result = classifyError(err);
    expect(result.retryable).toBe(true);
  });

  it('classifies explicit ProviderError with retryable=true as retryable', () => {
    const err = new ProviderError('SMTP Server Busy', 500, null, true);
    const result = classifyError(err);
    expect(result.retryable).toBe(true);
  });

  it('classifies invalid recipient formatting as non-retryable', () => {
    const err = new Error('Invalid email address format');
    err.code = 'INVALID_RECIPIENT';

    const result = classifyError(err);
    expect(result.retryable).toBe(false);
    expect(result.errorCode).toBe('INVALID_RECIPIENT');
  });

  it('classifies 422 Unprocessable Entity as non-retryable', () => {
    const err = new ProviderError('SMS channel unconfigured', 422, null, false);
    const result = classifyError(err);
    expect(result.retryable).toBe(false);
  });
});
