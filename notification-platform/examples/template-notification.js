const NotificationClient = require('notification-platform-node');

/**
 * Example 2: Dynamic Template Notification Delivery using the Node.js SDK
 */
async function sendTemplateNotification() {
  const apiKey = process.env.NOTIFICATION_API_KEY || 'your_api_key_here';
  const baseURL = process.env.NOTIFICATION_API_URL || 'http://localhost:5000/api/v1';

  const client = new NotificationClient({ apiKey, baseURL });

  try {
    console.log('Sending templated notification...');

    const response = await client.notifications.send({
      channel: 'EMAIL',
      category: 'TRANSACTIONAL',
      template: 'welcome-email',
      recipient: {
        externalUserId: 'usr_1001',
        email: 'alex@example.com',
      },
      data: {
        name: 'Alex',
        actionUrl: 'https://app.example.com/verify?token=xyz',
      },
    });

    console.log('✅ Templated Notification Enqueued Successfully:');
    console.log(`   ID: ${response.data.id}`);
    console.log(`   Status: ${response.data.status}`);
  } catch (error) {
    console.error('❌ Template Notification Error:', error.message);
  }
}

sendTemplateNotification();
