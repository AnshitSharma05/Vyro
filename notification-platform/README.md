# Notification Platform

> **Notification-as-a-Service (NaaS)**: Build notifications once. Let the platform handle delivery, queueing, retries, templates, provider failover, and analytics.

---

## 1. Overview & Core Value Proposition

Integrating multi-channel notification infrastructure (Email, SMS, WhatsApp, Push) into modern applications requires building custom message queues, exponential backoff retries, template rendering, provider failover routing, rate limiting, and delivery tracking.

**Notification Platform** abstracts notification infrastructure behind a single unified **REST API** and zero-dependency **Node.js SDK**:

```text
CUSTOMER APPLICATION / SDK
       │
       ▼
EXPRESS API SERVER (Ingestion & Validation ~6ms)
       │
       ├── Rate Limiting (Redis) ──► Quota Check ──► Idempotency Check
       │
       ▼
REDIS / BULLMQ ASYNCHRONOUS QUEUES
       │
       ▼
BACKGROUND WORKERS (Template Rendering & Provider Failover)
       │
  ┌────┴───────────────┬───────────────────┬───────────────────┐
  ▼                    ▼                   ▼                   ▼
SMTP Email          Mock SMS          Mock WhatsApp        Mock FCM Push
```

### Core Responsibilities Matrix:
- **Customer Application Controls**: When, why, who (recipient), channel selection, template variables, and notification payload.
- **Notification Platform Handles**: Asynchronous queueing, worker execution, provider failover, exponential backoff retries, delivery tracking, rate limiting, quota enforcement, and webhooks.

---

## 2. Technology Stack

- **Backend**: Node.js, Express.js, PostgreSQL 15, Prisma ORM, Redis 7, BullMQ, JWT, API Keys, bcrypt, Zod, Nodemailer, Pino Logger.
- **Frontend**: React 18, Vite, Tailwind CSS, React Router, Axios, TanStack Query, React Hook Form, Zod, Recharts, Lucide React.
- **SDK**: Node.js REST API Client (`sdk/node/`).
- **Infrastructure**: Docker, Docker Compose, GitHub Actions.

---

## 3. Quickstart Guide (Time to First Notification)

### Step 1: Start System via Docker Compose
```bash
# Start PostgreSQL, Redis, API Server, Worker, and Client
docker compose up -d
```

### Step 2: Install Node.js SDK
```bash
npm install notification-platform-node
```

### Step 3: Initialize Client & Send First Notification
```javascript
const NotificationClient = require('notification-platform-node');

const client = new NotificationClient({
  apiKey: 'your_api_key_here',
  baseURL: 'http://localhost:5000/api/v1',
});

async function main() {
  const result = await client.notifications.send({
    channel: 'EMAIL',
    category: 'TRANSACTIONAL',
    template: 'welcome-email',
    recipient: {
      email: 'user@example.com',
    },
    data: {
      name: 'Alex',
    },
  });

  console.log('Notification Enqueued:', result.data.id, result.data.status);
}

main();
```

---

## 4. Integration Examples & Documentation

Complete integration examples are available in `examples/`:
- [`examples/basic-email.js`](file:///c:/Users/anshi/OneDrive/GitHub/vyro/Vyro/notification-platform/examples/basic-email.js): Direct notification dispatch via SDK.
- [`examples/template-notification.js`](file:///c:/Users/anshi/OneDrive/GitHub/vyro/Vyro/notification-platform/examples/template-notification.js): Templated multi-channel notification.
- [`examples/event-trigger.js`](file:///c:/Users/anshi/OneDrive/GitHub/vyro/Vyro/notification-platform/examples/event-trigger.js): Business event tracking & workflow trigger.
- [`examples/idempotent-notification.js`](file:///c:/Users/anshi/OneDrive/GitHub/vyro/Vyro/notification-platform/examples/idempotent-notification.js): Safe retry handling using idempotency keys.
- [`examples/webhook-verification.js`](file:///c:/Users/anshi/OneDrive/GitHub/vyro/Vyro/notification-platform/examples/webhook-verification.js): Cryptographic HMAC signature verification helper.
- [`examples/curl-api.sh`](file:///c:/Users/anshi/OneDrive/GitHub/vyro/Vyro/notification-platform/examples/curl-api.sh): Complete REST API cURL commands.

### Documentation Suite (`docs/`):
- [Architecture Overview](file:///c:/Users/anshi/OneDrive/GitHub/vyro/Vyro/notification-platform/docs/architecture.md)
- [REST API Reference](file:///c:/Users/anshi/OneDrive/GitHub/vyro/Vyro/notification-platform/docs/api.md)
- [Node.js SDK Guide](file:///c:/Users/anshi/OneDrive/GitHub/vyro/Vyro/notification-platform/docs/sdk.md)
- [Security & Defense-in-Depth](file:///c:/Users/anshi/OneDrive/GitHub/vyro/Vyro/notification-platform/docs/security.md)
- [Performance & Benchmarks](file:///c:/Users/anshi/OneDrive/GitHub/vyro/Vyro/notification-platform/docs/performance.md)
- [Interview Preparation Guide](file:///c:/Users/anshi/OneDrive/GitHub/vyro/Vyro/notification-platform/docs/interview-preparation.md)
- [Technical Debt & Boundaries](file:///c:/Users/anshi/OneDrive/GitHub/vyro/Vyro/notification-platform/docs/technical-debt.md)
- [Portfolio & Demo Guide](file:///c:/Users/anshi/OneDrive/GitHub/vyro/Vyro/notification-platform/docs/portfolio.md)
- [Resume Bullet Points](file:///c:/Users/anshi/OneDrive/GitHub/vyro/Vyro/notification-platform/docs/resume-bullets.md)

---

## 5. Performance Benchmarks

Measured using `autocannon` against local baseline environments:
- **Notification Ingestion Latency**: **p50 = 6ms**, **p95 = 14ms**, **p99 = 28ms**
- **Throughput**: **~290 req/sec** notification ingestion
- **Concurrency Safety**: 100% quota enforcement accuracy under 30+ concurrent connections.

---

## 6. Development & Testing

```bash
# Execute Server Test Suite (53 suites, 225 tests)
npm --prefix server test

# Execute SDK Test Suite (3 suites, 7 tests)
npm --prefix sdk/node test

# Execute Performance Load Benchmark
npm run test:load
```
