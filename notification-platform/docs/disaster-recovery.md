# Disaster Recovery & Failure Mode Runbook

## 1. Executive Summary & RPO/RTO Objectives

This runbook documents recovery procedures, failure behaviors, and operational steps for 12 disaster scenarios on the **Notification-as-a-Service (NaaS) Platform**.

### Operational Objectives:
- **Recovery Point Objective (RPO)**: Target RPO $\le 5$ minutes for persistent relational data via automated PostgreSQL WAL archiving.
- **Recovery Time Objective (RTO)**: Target RTO $\le 15$ minutes for API process container restarts and worker queue reconnection.

---

## 2. Disaster Recovery Scenarios & Procedures

### Scenario 1: Express API Process Crash
- **Observed Behavior**: HTTP requests to `/api/v1/*` fail with connection refused (`ECONNREFUSED`).
- **Worker Behavior**: Background worker process continues consuming existing BullMQ jobs from Redis independently.
- **Recovery Action**: Container orchestrator automatically restarts API container (`restart: always`). Run `npm run server` to restore HTTP listeners.

### Scenario 2: Background Worker Process Crash
- **Observed Behavior**: Express API continues accepting notifications and enqueuing jobs (`HTTP 202 Accepted`). Queue depth in Redis grows (`PUNCTUAL` / `PENDING`).
- **Recovery Action**: Restart worker container (`npm run worker`). BullMQ automatically resumes job processing from Redis queues.

### Scenario 3: Redis Cache & Queue Outage
- **Observed Behavior**: Readiness probe `/health/ready` fails with HTTP 503 (`healthy: false, redis: false`). Rate limiting fails open safely; notification enqueueing throws 503 Service Unavailable.
- **Recovery Action**: Restart Redis (`docker compose restart redis`). Health check returns to 200 OK. Workers automatically reconnect and resume BullMQ polling.

### Scenario 4: PostgreSQL Primary Database Outage
- **Observed Behavior**: Readiness probe `/health/ready` fails with HTTP 503 (`postgres: false`). API requests requiring database state return HTTP 500/503.
- **Recovery Action**: Restart PostgreSQL service. Prisma Client automatically re-establishes connection pools without requiring process restart.

### Scenario 5: Primary Notification Provider Outage (SMTP Gateway Failure)
- **Observed Behavior**: Primary email provider throws socket timeout or HTTP 5xx errors.
- **System Behavior**: `ProviderRouter` logs a failed attempt (`NotificationAttempt`) and automatically routes message to configured fallback provider. If all providers fail, BullMQ schedules exponential backoff retries.

### Scenario 6: Third-Party Provider Network Timeout
- **Observed Behavior**: Provider accepts HTTP connection but network drops ACK.
- **System Behavior**: Worker timeout fires, recording a failed attempt. BullMQ retries the job. *Note: Distributed delivery guarantees are strictly **at-least-once**. Duplicate delivery may occur if provider sent message prior to network ACK loss.*

### Scenario 7: Customer Webhook Consumer Failure (500 Error)
- **Observed Behavior**: Customer webhook endpoint returns HTTP 500.
- **System Behavior**: `WebhookDelivery` status logged as `FAILED`. Asynchronous delivery worker retries with exponential backoff up to 3 times without blocking core notification queue processing.

### Scenario 8: Customer Webhook Consumer Timeout (Slow Consumer)
- **Observed Behavior**: Customer webhook server hangs without responding.
- **System Behavior**: 5-second HTTP timeout fires. Webhook worker logs timeout failure and releases worker process thread.

### Scenario 9: Queue Backlog Surge
- **Observed Behavior**: Notification arrival rate exceeds worker processing capacity. BullMQ queue depth grows.
- **System Behavior**: Express API responds with HTTP 202. Jobs accumulate in Redis. Once traffic drops, background workers drain queue backlog to zero.

### Scenario 10: Secret Credential Compromise (API Key / JWT Secret)
- **Recovery Procedure**:
  1. Revoke compromised API key immediately via Dashboard or `POST /api/v1/projects/{id}/api-keys/{keyId}/revoke`.
  2. Rotate `JWT_SECRET` in environment variables.
  3. Deploy updated API containers to invalidate existing JWT user sessions.

### Scenario 11: Deployment Rollback Execution
- **Recovery Procedure**:
  1. If version $N+1$ fails health checks, revert container image tag to version $N$.
  2. Database schema migrations (`prisma migrate deploy`) use expand-contract pattern; version $N$ application remains compatible with non-destructive schema additions.

### Scenario 12: Database Backup & Restore Execution
- **Backup Command**:
  ```bash
  pg_dump -U postgres -d notification_db > backup.sql
  ```
- **Restore Command**:
  ```bash
  psql -U postgres -d notification_restore_db < backup.sql
  ```
