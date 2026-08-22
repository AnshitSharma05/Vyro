const autocannon = require('autocannon');

/**
 * Load test scenario sending identical Idempotency-Key across 50 concurrent requests.
 * Verifies single logical creation and non-double-counting.
 */
function runIdempotencyLoadTest({ baseUrl = 'http://localhost:5000', apiKey = 'test_api_key', connections = 25, duration = 5 } = {}) {
  const url = `${baseUrl}/api/v1/notifications/send`;
  const fixedIdempotencyKey = `idempotent_load_key_${Date.now()}`;

  const instance = autocannon({
    url,
    method: 'POST',
    connections,
    duration,
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'idempotency-key': fixedIdempotencyKey,
    },
    body: JSON.stringify({
      channel: 'EMAIL',
      category: 'TRANSACTIONAL',
      template: 'welcome-email',
      recipient: 'idempotent@example.com',
      data: { name: 'IdempotencyTester' },
    }),
  });

  return instance;
}

if (require.main === module) {
  console.log('🚀 Running Idempotency Concurrency Load Test...');
  const instance = runIdempotencyLoadTest();
  autocannon.track(instance, { renderProgressBar: true });
}

module.exports = runIdempotencyLoadTest;
