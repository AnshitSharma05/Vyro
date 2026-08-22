const NotificationClient = require('notification-platform-node');

/**
 * Example 4: Safe Retries using Idempotency Keys
 */
async function sendIdempotentNotification() {
  const apiKey = process.env.NOTIFICATION_API_KEY || 'your_api_key_here';
  const baseURL = process.env.NOTIFICATION_API_URL || 'http://localhost:5000/api/v1';

  const client = new NotificationClient({ apiKey, baseURL });
  const idempotencyKey = `idempotent_order_checkout_${Date.now()}`;

  try {
    console.log('Sending first notification attempt with Idempotency Key...');
    const res1 = await client.notifications.send(
      {
        channel: 'EMAIL',
        category: 'TRANSACTIONAL',
        template: 'welcome-email',
        recipient: { email: 'user@example.com' },
        data: { name: 'User' },
      },
      { idempotencyKey }
    );
    console.log(`✅ Attempt 1 Result ID: ${res1.data.id}`);

    console.log('\nSending second notification attempt with SAME Idempotency Key...');
    const res2 = await client.notifications.send(
      {
        channel: 'EMAIL',
        category: 'TRANSACTIONAL',
        template: 'welcome-email',
        recipient: { email: 'user@example.com' },
        data: { name: 'User' },
      },
      { idempotencyKey }
    );
    console.log(`✅ Attempt 2 Result ID: ${res2.data.id} (Identical ID returned, no duplicate created)`);
  } catch (error) {
    console.error('❌ Idempotency Test Error:', error.message);
  }
}

sendIdempotentNotification();
