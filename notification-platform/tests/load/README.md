# Performance & Load Testing Suite

This directory contains load test scenarios using `autocannon`:

## Running Load Tests

### 1. Start Server & Workers
Ensure local environment (Express API server + PostgreSQL + Redis) is running:
```bash
npm run server
```

### 2. Execute Load Benchmark Suite
```bash
npm run test:load
```

### 3. Individual Scenarios
```bash
node tests/load/notifications.load.js
node tests/load/events.load.js
node tests/load/quotas.load.js
node tests/load/idempotency.load.js
node tests/load/rate-limit.load.js
```
