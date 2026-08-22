const autocannon = require('autocannon');

/**
 * Load test scenario sending burst traffic to trigger HTTP 429 rate limit responses.
 */
function runRateLimitLoadTest({ baseUrl = 'http://localhost:5000', apiKey = 'test_api_key', connections = 50, duration = 5 } = {}) {
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
      channel: 'SMS',
      recipient: '+15550001111',
      data: { code: '123456' },
    }),
  });

  return instance;
}

if (require.main === module) {
  console.log('🚀 Running Rate Limiting Load Test...');
  const instance = runRateLimitLoadTest();
  autocannon.track(instance, { renderProgressBar: true });
}

module.exports = runRateLimitLoadTest;
