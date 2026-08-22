const autocannon = require('autocannon');

/**
 * Load test scenario for business event ingestion endpoint (POST /api/v1/events).
 *
 * @param {Object} options
 * @param {string} [options.baseUrl='http://localhost:5000']
 * @param {string} [options.apiKey='test_api_key']
 * @param {number} [options.connections=20]
 * @param {number} [options.duration=10]
 */
function runEventLoadTest({ baseUrl = 'http://localhost:5000', apiKey = 'test_api_key', connections = 20, duration = 10 } = {}) {
  const url = `${baseUrl}/api/v1/events`;

  let counter = 0;

  const instance = autocannon({
    url,
    method: 'POST',
    connections,
    duration,
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
    },
    setupClient: (client) => {
      client.on('request', () => {
        counter += 1;
        client.setBody(
          JSON.stringify({
            event: 'ORDER_CREATED',
            externalEventId: `load_evt_${Date.now()}_${counter}_${Math.random().toString(36).substring(7)}`,
            recipient: { externalUserId: `usr_${counter}` },
            data: { orderId: `ORD-${counter}`, amount: 99.99 },
          })
        );
      });
    },
  });

  return instance;
}

if (require.main === module) {
  console.log('🚀 Running Event Ingestion Load Test...');
  const instance = runEventLoadTest();
  autocannon.track(instance, { renderProgressBar: true });
}

module.exports = runEventLoadTest;
