# Production Deployment, CI/CD & Operations Guide

## 1. Executive Summary & Deployment Topology
This document outlines the deployment strategy, containerization model, CI/CD pipeline, and operational procedures for the **Notification-as-a-Service (NaaS) Platform**.

```text
                        INTERNET / CLIENTS
                                │
                                ▼
                       REACT DASHBOARD (Vite/Client)
                                │
                                ▼
                        EXPRESS API SERVER (src/server.js)
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
  PostgreSQL (Primary)    Redis (Cache/Store)    Webhooks / Endpoints
                                │
                                ▼
                         BULLMQ QUEUES
                                │
                                ▼
                     BACKGROUND WORKER PROCESS (src/workers/worker.js)
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
    SMTP Email Provider     FCM Push Provider   Mock Providers (SMS/WA)
```

---

## 2. Independent API vs. Worker Process Strategy
To ensure system stability under heavy processing loads:
- **API Server Process (`src/server.js`)**: Handles HTTP requests, JWT/API Key authentication, authorization, rate limits, quota enforcement, and BullMQ job enqueueing.
- **Worker Process (`src/workers/worker.js`)**: Consumes background notification and event jobs, manages provider router failover sequences, and updates delivery attempts independently.

---

## 3. Local Docker Compose Orchestration
For local development without cloud dependencies, Docker Compose orchestrates all required services:

```bash
# 1. Start all containers (PostgreSQL, Redis, API Server, Worker, Client)
docker compose up -d

# 2. View container logs
docker compose logs -f

# 3. Stop containers and preserve volumes
docker compose down
```

---

## 4. Continuous Integration Pipeline (GitHub Actions)
Continuous integration is configured in `.github/workflows/ci.yml`. It runs automatically on `push` and `pull_request` to the `main` branch using PostgreSQL and Redis service containers.

### Pipeline Stages:
1. **Checkout & Setup Node.js**: Installs Node 20 with `npm ci` caching.
2. **Prisma Generate & Migrate**: Generates the Prisma client and executes `prisma migrate deploy` against the test service container.
3. **Linting & Unit/Integration Tests**: Executes ESLint and full Jest test suites across backend and SDK.
4. **Build Verification**: Compiles Vite client production bundle (`dist/`).

---

## 5. Production Database Migration & Rollback Strategy

### Migration Command
In production deployments, **NEVER** run `prisma migrate dev`. Always execute:
```bash
npx prisma migrate deploy
```

### Expand-Contract Migration Pattern
To support zero-downtime rolling deployments:
1. **Expand**: Add new columns/tables as optional/nullable.
2. **Deploy Application**: Deploy updated application code writing to new structures.
3. **Contract**: Remove legacy unused columns in a subsequent release once all active instances are updated.

### Rollback Strategy
Prisma migrations are forward-only. For rollbacks:
- If application version N+1 fails, revert the application container to version N (ensuring schema changes are forward-compatible).
- Restore database state from PostgreSQL backups (`pg_restore`) if destructive database corruption occurs.

---

## 6. Post-Deployment Verification & Health Probes
After deploying a new container instance, run the automated smoke test script:
```bash
npm --prefix server run smoke-test
```

### Health Endpoints:
- `GET /health/live`: Process liveness probe (`200 OK`).
- `GET /health/ready`: Deep readiness probe checking PostgreSQL (`$queryRaw`) and Redis (`ping`) status (`200 OK` or `503 Service Unavailable`).
