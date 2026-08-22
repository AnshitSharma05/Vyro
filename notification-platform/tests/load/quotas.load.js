const autocannon = require('autocannon');

/**
 * Load test scenario verifying quota check behavior under heavy concurrency.
 */
function runQuotaLoadTest({ baseUrl = 'http://localhost:5000', apiKey = 'test_api_key', connections = 30, duration = 5 } = {}) {
  const url = `${baseUrl}/api/v1/notifications/send`;

  const instance = autocannon({
    url,
    method: 'POST',
    connections,
    duration,
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      channel: 'EMAIL',
      category: 'TRANSACTIONAL',
      template: 'welcome-email',
      recipient: 'quotaload@example.com',
      data: { name: 'QuotaTest' },
    }),
  });

  return instance;
}

if (require.main === module) {
  console.log('🚀 Running Quota Concurrency Load Test...');
  const instance = runQuotaLoadTest();
  autocannon.track(instance, { renderProgressBar: true });
}

module.exports = runQuotaLoadTest;
