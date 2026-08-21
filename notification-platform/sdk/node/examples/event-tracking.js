const NotificationClient = require('../src/index');

const client = new NotificationClient({
  apiKey: process.env.NOTIFICATION_API_KEY || 'test_api_key_123',
  baseURL: process.env.NOTIFICATION_BASE_URL || 'http://localhost:5000/api/v1',
});

async function main() {
  console.log('Tracking business event: ORDER_CREATED...');
  const result = await client.events.track({
    event: 'ORDER_CREATED',
    externalEventId: `order_${Date.now()}_created`,
    recipient: {
      externalUserId: 'user_cust_555',
      email: 'customer@example.com',
    },
    data: {
      orderId: 'ORD-555',
      amount: 149.99,
      itemCount: 3,
    },
  });

  console.log('Event Track Response:', result);
}

main().catch(console.error);
