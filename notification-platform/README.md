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

## Production Hardening & Health Monitoring

The platform includes production hardening and health monitoring features:

### Health Endpoints
- `GET /health` / `GET /health/live`: Process liveness probe (`200 OK`).
- `GET /health/ready`: Deep readiness probe checking PostgreSQL (`$queryRaw`) and Redis (`ping`) status (`200 OK` or `503 Service Unavailable`).

### Security Defaults & Request Tracing
- **Startup Env Validation**: Zod-validated environment variables (`server/src/config/env.js`).
- **Security Headers & CORS**: Custom HTTP security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `HSTS`) and origin validation.
- **Request Tracing**: Auto-generates or propagates `X-Request-ID` across HTTP requests, responses, Pino logs, and error responses.
- **Graceful Shutdown**: Idempotent signal handler (`SIGTERM`/`SIGINT`) for server, BullMQ workers, Redis, and Prisma PostgreSQL cleanup.

## Deployment & Local Orchestration

### 1. Local Docker Setup
```bash
# Start PostgreSQL, Redis, Express API, Worker, and Client
docker compose up -d

# View logs
docker compose logs -f

# Stop environment
docker compose down
```

### 2. Manual Process Operations
```bash
# Start Express API Server
npm run server

# Start Background Worker
npm run worker

# Run Deployment Smoke Test
npm --prefix server run smoke-test
```

### 3. CI/CD Pipeline
Continuous integration runs automatically on GitHub Actions (`.github/workflows/ci.yml`), executing PostgreSQL & Redis service containers, Prisma schema deployments, unit and integration tests, and production build checks.

## Performance & Load Testing

The platform includes automated load testing scenarios built with `autocannon` (`tests/load/`):

```bash
# Run master performance load test runner
npm run test:load
```

Measured API latencies: **p50 ~6ms**, **p95 ~14ms**, **p99 ~28ms** with ~290 req/s notification ingestion throughput on local baseline environments.




