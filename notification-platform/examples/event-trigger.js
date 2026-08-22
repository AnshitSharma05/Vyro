const NotificationClient = require('notification-platform-node');

/**
 * Example 3: Tracking Business Events & Triggering Automated Workflows
 */
async function trackBusinessEvent() {
  const apiKey = process.env.NOTIFICATION_API_KEY || 'your_api_key_here';
  const baseURL = process.env.NOTIFICATION_API_URL || 'http://localhost:5000/api/v1';

  const client = new NotificationClient({ apiKey, baseURL });

  try {
    console.log('Tracking ORDER_CREATED business event...');

    const response = await client.events.track({
      event: 'ORDER_CREATED',
      externalEventId: `evt_order_${Date.now()}`,
      recipient: {
        externalUserId: 'usr_2002',
        email: 'customer@example.com',
      },
      data: {
        orderId: 'ORD-98765',
        totalAmount: 149.99,
        itemsCount: 3,
      },
    });

    console.log('✅ Business Event Tracked & Workflow Triggered:');
    console.log(`   Event ID: ${response.data.id}`);
    console.log(`   Notifications Triggered: ${response.data.triggeredCount || 1}`);
  } catch (error) {
    console.error('❌ Event Tracking Error:', error.message);
  }
}

trackBusinessEvent();
