# Redis, BullMQ & Background Worker Architecture

## 1. Executive Summary & Problem Context
In earlier phases, notification delivery was executed **synchronously** inside the Express HTTP request-response cycle. While appropriate for validating early pipeline correctness, synchronous delivery meant the REST API had to block until external SMTP servers or third-party networks responded (often taking 2–5+ seconds).

**Phase 8** transitions delivery to an **asynchronous architecture** using **Redis** and **BullMQ**. The Express API creates the notification job in PostgreSQL with status `PENDING`, enqueues a lightweight job payload into BullMQ, and immediately returns **HTTP 202 Accepted**. A separate, decoupled background worker process consumes jobs and handles network delivery asynchronously.

---

## 2. Asynchronous Delivery Pipeline Architecture

```text
CLIENT APPLICATION
        │
        │ X-API-Key: np_live_...
        ▼
EXPRESS REST API (server.js)
        │
        ├── 1. Validate Request & Resolve Template
        ├── 2. Render Content Snapshot (Subject & Body)
        ├── 3. Insert Notification Record (PostgreSQL, Status: PENDING)
        ├── 4. Enqueue BullMQ Job ({ notificationId })
        └── 5. Return HTTP 202 Accepted (Immediate Response)

─────────────────────────────────────────────────────────────────────────────
SEPARATE BACKGROUND WORKER PROCESS (worker.js):

BullMQ Queue ("notifications") ◄── Redis Connection (redis://localhost:6379)
        │
        ▼
Notification Worker (notification.worker.js)
        │
        ├── 1. Read Job Payload ({ notificationId })
        ├── 2. Atomic Transition (PENDING -> PROCESSING in PostgreSQL)
        ├── 3. Select Provider (EmailProvider / Nodemailer)
        ├── 4. Dispatch Payload via SMTP Network
        ├── 5. Insert NotificationAttempt Record (SUCCESS / FAILED)
        └── 6. Update Notification Status (SENT / FAILED)
```

---

## 3. Key Architectural Decisions

### A. Minimal Job Payload Design
Jobs enqueued to Redis contain **only the notification ID**:
```json
{
  "notificationId": "notif-uuid-1234"
}
```
#### Rationale
Storing only `notificationId` in Redis ensures **PostgreSQL remains the single source of truth**. Storing full message bodies or recipient addresses in Redis risks data stale-ness, data duplication, and bloat in Redis memory.

### B. Atomic Status Transitions & Duplicate Defense
Before invoking the provider, the worker executes an atomic conditional update query in PostgreSQL:
```sql
UPDATE notifications
SET status = 'PROCESSING'
WHERE id = notificationId AND status = 'PENDING';
```
If `count === 0` (e.g. if the job was already processed by another worker or is currently running), the worker **skips execution**, guarding against duplicate email delivery.

### C. Redis Queue Insertion Failure Strategy
If Redis is offline or enqueueing fails during `POST /api/v1/notifications/send`:
1. The service catches the error.
2. The database record status is updated to `FAILED` (`failedAt: now()`).
3. An `AppError('Failed to enqueue notification for processing', 500)` is thrown.
4. The client receives an explicit 500 error instead of a false success.

---

## 4. Process Isolation & Lifecycle Scripts

| Process | Entry Point | Development Script | Description |
| :--- | :--- | :--- | :--- |
| **HTTP REST API** | `server/src/server.js` | `npm run dev` | Express server handling client HTTP requests |
| **Background Worker** | `server/src/workers/worker.js` | `npm run worker:dev` | Standalone BullMQ consumer process |

The HTTP server (`server.js`) **does NOT auto-start the worker process**, guaranteeing separate scaling and deployment life cycles.

---

## 5. Graceful Shutdown
Both process entry points implement signal handlers for `SIGINT` and `SIGTERM`:
1. Stop accepting new HTTP requests or BullMQ jobs.
2. Allow active worker jobs to finish safely.
3. Close worker queue connections (`await worker.close()`).
4. Disconnect Prisma PostgreSQL client (`await prisma.$disconnect()`).
5. Exit process with code 0.

---

## 6. Preparation for Phase 9 Retries
Phase 8 focuses on successful asynchronous execution. Automatic worker retries, exponential backoff, and dead-letter queue handling are intentionally postponed to **Phase 9**.
