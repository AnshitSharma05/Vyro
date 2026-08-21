const NotificationClient = require('../src/index');

const client = new NotificationClient({
  apiKey: process.env.NOTIFICATION_API_KEY || 'test_api_key_123',
  baseURL: process.env.NOTIFICATION_BASE_URL || 'http://localhost:5000/api/v1',
  debug: true,
});

async function main() {
  console.log('Sending direct notification...');
  const result = await client.notifications.send(
    {
      channel: 'EMAIL',
      category: 'TRANSACTIONAL',
      template: 'welcome-email',
      recipient: {
        externalUserId: 'user_dev_101',
        email: 'developer@example.com',
      },
      data: {
        name: 'Developer',
      },
    },
    {
      idempotencyKey: 'idempotent-welcome-user-101',
    }
  );

  console.log('Notification Response:', result);
}

main().catch(console.error);
