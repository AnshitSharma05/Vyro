const NotificationClient = require('notification-platform-node');

/**
 * Example 1: Basic Direct Notification Delivery using the Node.js SDK
 */
async function sendBasicNotification() {
  const apiKey = process.env.NOTIFICATION_API_KEY || 'your_api_key_here';
  const baseURL = process.env.NOTIFICATION_API_URL || 'http://localhost:5000/api/v1';

  const client = new NotificationClient({ apiKey, baseURL });

  try {
    console.log('Sending direct email notification via SDK...');

    const response = await client.notifications.send({
      channel: 'EMAIL',
      category: 'TRANSACTIONAL',
      recipient: {
        email: 'developer@example.com',
      },
      content: {
        subject: 'Welcome to NaaS Platform',
        body: 'Thank you for integrating our Notification-as-a-Service platform!',
      },
    });

    console.log('✅ Notification Enqueued Successfully:');
    console.log(`   ID: ${response.data.id}`);
    console.log(`   Status: ${response.data.status}`);
  } catch (error) {
    console.error('❌ Notification Error:', error.message);
  }
}

sendBasicNotification();
