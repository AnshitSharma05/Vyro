# Notification Platform

Notification-as-a-Service (NaaS) platform for developers to integrate multi-channel notifications (Email, SMS, WhatsApp, Push).

## Developer SDK Integration (`notification-platform-node`)

The platform includes an official Node.js SDK located in `sdk/node/`.

### 1. Installation

```bash
npm install notification-platform-node
```

### 2. Initialize SDK Client

```javascript
const NotificationClient = require('notification-platform-node');

const client = new NotificationClient({
  apiKey: process.env.NOTIFICATION_API_KEY,
  baseURL: 'http://localhost:5000/api/v1',
});
```

### 3. Send Notification

```javascript
const result = await client.notifications.send({
  channel: 'EMAIL',
  category: 'TRANSACTIONAL',
  template: 'welcome-email',
  recipient: {
    externalUserId: 'user_101',
    email: 'user@example.com',
  },
  data: {
    name: 'Alex',
  },
});
```

### 4. Track Business Event

```javascript
await client.events.track({
  event: 'ORDER_CREATED',
  externalEventId: 'order_123_created',
  recipient: {
    externalUserId: 'user_101',
  },
  data: {
    orderId: 'ORD-123',
    amount: 49.99,
  },
});
```

