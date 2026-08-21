const NotificationClient = require('../src/index');

const client = new NotificationClient({
  apiKey: process.env.NOTIFICATION_API_KEY || 'test_api_key_123',
  baseURL: process.env.NOTIFICATION_BASE_URL || 'http://localhost:5000/api/v1',
});

async function main() {
  console.log('Creating notification workflow rule...');
  const workflow = await client.workflows.create({
    name: 'Order Confirmation Automated Sequence',
    description: 'Sends email immediately and push notification after 60s when an order is created',
    eventName: 'ORDER_CREATED',
    status: 'ACTIVE',
    actions: [
      {
        order: 1,
        channel: 'EMAIL',
        category: 'TRANSACTIONAL',
        template: 'order-confirmation',
        delaySeconds: 0,
      },
      {
        order: 2,
        channel: 'PUSH',
        category: 'TRANSACTIONAL',
        template: 'order-push-alert',
        delaySeconds: 60,
      },
    ],
  });

  console.log('Workflow created:', workflow);
}

main().catch(console.error);
