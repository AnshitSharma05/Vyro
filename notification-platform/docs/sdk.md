# Official Node.js SDK Reference (`notification-platform-node`)

## 1. Installation
```bash
npm install notification-platform-node
```

---

## 2. Quickstart & Initialization

```javascript
const NotificationClient = require('notification-platform-node');

const client = new NotificationClient({
  apiKey: process.env.NOTIFICATION_API_KEY,
  baseURL: 'http://localhost:5000/api/v1', // Optional custom host
  timeout: 10000,                           // 10s default HTTP timeout
  maxRetries: 3,                            // Exponential backoff retries
});
```

---

## 3. Resource Namespaces & Methods

- **`client.notifications.send(payload, options)`**: Send direct or templated notifications across Email, SMS, WhatsApp, or Push channels.
- **`client.events.track(payload, options)`**: Track business events triggering multi-step notification workflows.
- **`client.templates.list()`, `client.templates.create(payload)`**: Manage multi-channel message templates.
- **`client.recipients.get(id)`, `client.recipients.upsert(payload)`**: Manage recipient profiles and channel preferences.
- **`client.webhooks.verifySignature(payload, signature, secret)`**: Cryptographically verify incoming webhook signatures.
- **`client.usage.getSummary()`**: Retrieve organization quota utilization metrics.

---

## 4. Safe Retries & Idempotency
To safely retry requests without risking duplicate notifications:
```javascript
const response = await client.notifications.send(
  {
    channel: 'EMAIL',
    template: 'welcome-email',
    recipient: { email: 'alex@example.com' },
  },
  {
    idempotencyKey: 'checkout_order_99812',
  }
);
```

---

## 5. Typed Error Handling Hierarchy
```javascript
const { 
  AuthenticationError, 
  QuotaExceededError, 
  RateLimitError, 
  ValidationError 
} = NotificationClient;

try {
  await client.notifications.send({ ... });
} catch (error) {
  if (error instanceof QuotaExceededError) {
    console.error('Organization quota exceeded:', error.message);
  } else if (error instanceof RateLimitError) {
    console.error('Rate limit reached. Retry after:', error.retryAfter);
  } else {
    console.error('API Error:', error.message, error.requestId);
  }
}
```
