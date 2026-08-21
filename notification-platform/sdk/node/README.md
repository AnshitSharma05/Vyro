# Notification Platform Node.js SDK (`notification-platform-node`)

The official Node.js SDK for integrating with the Notification-as-a-Service (NaaS) platform.

## Installation

```bash
npm install notification-platform-node
```

## Quick Start

```javascript
const NotificationClient = require('notification-platform-node');

const client = new NotificationClient({
  apiKey: process.env.NOTIFICATION_API_KEY,
  baseURL: 'http://localhost:5000/api/v1', // Optional custom base URL
});

async function run() {
  // Send a transactional email notification
  const notification = await client.notifications.send({
    template: 'welcome-email',
    category: 'TRANSACTIONAL',
    recipient: {
      externalUserId: 'user_123',
      email: 'alex@example.com',
    },
    data: {
      name: 'Alex',
    },
  });

  console.log('Notification sent:', notification.id, notification.status);
}

run().catch(console.error);
```

---

## Features

- **Asynchronous Business Event Tracking**: Emit events like `ORDER_CREATED` or `USER_REGISTERED` and let server workflows trigger notification rules.
- **Resilient Retry Engine**: Automatic exponential backoff retries for transient HTTP errors (`429`, `502`, `503`, `504`, timeouts). Safe POST retries with idempotency.
- **HMAC Signature Verification**: Built-in helper for validating customer webhooks (`client.webhooks.verifySignature`).
- **Normalized Errors**: Type-safe SDK errors (`AuthenticationError`, `RateLimitError`, `ConflictError`, `ValidationError`).
- **TypeScript Support**: Complete `index.d.ts` declaration file included.

---

## Usage Examples

### 1. Tracking Business Events

```javascript
await client.events.track({
  event: 'ORDER_CREATED',
  externalEventId: 'order_99812_created',
  recipient: {
    externalUserId: 'user_456',
  },
  data: {
    orderId: 'ORD-99812',
    amount: 49.99,
  },
});
```

### 2. Idempotent Notification Dispatch

```javascript
await client.notifications.send(
  {
    channel: 'EMAIL',
    template: 'order-confirmation',
    recipient: 'user@example.com',
    data: { orderId: 'ORD-100' },
  },
  {
    idempotencyKey: 'idempotent-order-100',
  }
);
```

### 3. Managing Recipient Preferences

```javascript
await client.preferences.update('user_456', {
  MARKETING: {
    EMAIL: false,
    SMS: false,
  },
});
```

### 4. Registering Push Notification Devices

```javascript
await client.devices.register('user_456', {
  token: 'fcm_device_token_abc123',
  platform: 'IOS',
});
```

### 5. Verifying Inbound Webhook Signatures

```javascript
const isValid = client.webhooks.verifySignature(
  rawBodyBuffer,
  req.headers['x-signature'],
  process.env.WEBHOOK_SECRET
);

if (!isValid) {
  return res.status(401).send('Invalid signature');
}
```

---

## Error Handling

```javascript
const { RateLimitError, ValidationError, AuthenticationError } = require('notification-platform-node');

try {
  await client.notifications.send({ ... });
} catch (err) {
  if (err instanceof RateLimitError) {
    console.error(`Rate limited. Retry after ${err.retryAfter} seconds.`);
  } else if (err instanceof ValidationError) {
    console.error(`Validation Error: ${err.message}`, err.details);
  } else if (err instanceof AuthenticationError) {
    console.error('Invalid API Key provided');
  }
}
```
