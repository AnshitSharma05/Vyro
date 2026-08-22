const autocannon = require('autocannon');

/**
 * Load test scenario for notification ingestion endpoint (POST /api/v1/notifications/send).
 *
 * @param {Object} options
 * @param {string} [options.baseUrl='http://localhost:5000']
 * @param {string} [options.apiKey='test_api_key_load']
 * @param {number} [options.connections=20]
 * @param {number} [options.duration=10]
 */
function runNotificationLoadTest({ baseUrl = 'http://localhost:5000', apiKey = 'test_api_key', connections = 20, duration = 10 } = {}) {
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
      recipient: 'loadtest@example.com',
      data: { name: 'LoadTester' },
    }),
  });

  return instance;
}

if (require.main === module) {
  console.log('🚀 Running Notification Ingestion Load Test...');
  const instance = runNotificationLoadTest();
  autocannon.track(instance, { renderProgressBar: true });
}

module.exports = runNotificationLoadTest;
