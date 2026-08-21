const providerFailoverPolicy = require('../../src/providers/provider.failover-policy');
const providerRouter = require('../../src/providers/provider.router');
const ProviderError = require('../../src/shared/errors/provider-error');

describe('Provider Failover Policy & Router Unit Tests', () => {
  const originalPrimaryMode = process.env.MOCK_SMS_MODE;
  const originalFallbackMode = process.env.MOCK_FALLBACK_MODE;

  afterEach(() => {
    process.env.MOCK_SMS_MODE = originalPrimaryMode;
    process.env.MOCK_FALLBACK_MODE = originalFallbackMode;
  });

  describe('ProviderFailoverPolicy', () => {
    it('1. Returns false for non-retryable recipient/payload errors', () => {
      const errRecipient = new ProviderError('Recipient phone number is required', 400);
      errRecipient.code = 'INVALID_RECIPIENT';

      const errEmail = new ProviderError('Invalid email format', 400);
      errEmail.code = 'INVALID_RECIPIENT_EMAIL';

      expect(providerFailoverPolicy.isFailoverEligible(errRecipient)).toBe(false);
      expect(providerFailoverPolicy.isFailoverEligible(errEmail)).toBe(false);
    });

    it('2. Returns true for provider-availability failures and timeouts', () => {
      const errTimeout = new ProviderError('Connection timed out', 504);
      errTimeout.code = 'TIMEOUT';

      const err503 = new ProviderError('Service Unavailable', 503);
      err503.code = 'PROVIDER_UNAVAILABLE';

      expect(providerFailoverPolicy.isFailoverEligible(errTimeout)).toBe(true);
      expect(providerFailoverPolicy.isFailoverEligible(err503)).toBe(true);
    });
  });

  describe('ProviderRouter', () => {
    it('1. Returns primary result when primary provider succeeds', async () => {
      const result = await providerRouter.sendNotificationWithFailover({
        channel: 'SMS',
        recipient: '+919999999999',
        body: 'Hello World',
      });

      expect(result.success).toBe(true);
      expect(result.failoverTriggered).toBe(false);
      expect(result.attempts.length).toBe(1);
      expect(result.attempts[0].provider).toBe('mock-sms');
    });

    it('2. Triggers fallback provider when primary provider experiences temporary failure', async () => {
      process.env.MOCK_SMS_MODE = 'failure'; // Force primary SMS provider to fail

      const result = await providerRouter.sendNotificationWithFailover({
        channel: 'SMS',
        recipient: '+919999999999',
        body: 'Hello Fallback',
      });

      expect(result.success).toBe(true);
      expect(result.failoverTriggered).toBe(true);
      expect(result.attempts.length).toBe(2);
      expect(result.attempts[0].status).toBe('FAILED');
      expect(result.attempts[0].attemptReason).toBe('PRIMARY');
      expect(result.attempts[1].status).toBe('SUCCESS');
      expect(result.attempts[1].provider).toBe('mock-sms-fallback');
      expect(result.attempts[1].attemptReason).toBe('FAILOVER');
    });

    it('3. Returns failure when both primary and fallback providers fail', async () => {
      process.env.MOCK_SMS_MODE = 'failure';
      process.env.MOCK_FALLBACK_MODE = 'failure';

      const result = await providerRouter.sendNotificationWithFailover({
        channel: 'SMS',
        recipient: '+919999999999',
        body: 'Both Fail',
      });

      expect(result.success).toBe(false);
      expect(result.failoverTriggered).toBe(true);
      expect(result.attempts.length).toBe(2);
      expect(result.attempts[0].status).toBe('FAILED');
      expect(result.attempts[1].status).toBe('FAILED');
    });
  });
});
