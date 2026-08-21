# Notification Workflows & Event-Driven Automation Architecture

## 1. Executive Summary & Core Purpose
Customer applications own **Business Events** (`ORDER_CREATED`, `USER_REGISTERED`, `PASSWORD_RESET`, `SUBSCRIPTION_EXPIRING`), while the Notification Platform owns **Notification Orchestration** (`WHEN EVENT -> DO NOTIFICATION ACTION(S)`).

**Phase 19** introduces:
1. **Event Ingestion**: Asynchronous ingestion via `POST /api/v1/events` returning **HTTP 202 Accepted**.
2. **Event Idempotency**: Unique constraint on `(projectId, externalEventId)` prevents duplicate event ingestion.
3. **Workflow Rules Engine**: `Workflow` definitions mapping event names to ordered `WorkflowAction`s.
4. **Integration with Notification Service**: Workflows **never** call providers directly. All actions invoke `notificationService.sendNotification(...)`, preserving Phase 18 recipient preferences, suppression, Phase 16 failover, Phase 9 retries, Phase 14 scheduling, and Phase 12 webhooks.
5. **Recursion Safeguard**: Workflow actions can **only** trigger notifications, never new events.

---

## 2. Event-Driven Workflow Processing Flow

```text
CUSTOMER APPLICATION (POST /api/v1/events)
       │
       ▼
EVENT INGESTION SERVICE (src/modules/events/event.service.js)
       │
       ├── Check Idempotency (projectId, externalEventId)
       ├── Persist Event (STATUS: RECEIVED)
       ├── Enqueue BullMQ Event Job (src/queues/event.queue.js)
       └── Return HTTP 202 Accepted
       │
       ▼
EVENT WORKER (src/workers/event.worker.js)
       │
       ├── Fetch Active Workflows (projectId, eventName, status=ACTIVE)
       │
       ├── For Each Matching Workflow:
       │      │
       │      ├── Create WorkflowExecution (STATUS: PROCESSING)
       │      │
       │      └── For Each WorkflowAction (Ordered by action.order):
       │             │
       │             ├── Calculate Scheduled Date (delaySeconds)
       │             ├── Invoke NotificationService.sendNotification({
       │             │     projectId, channel, templateName, category, recipient, data: payload, scheduledAt
       │             │   })
       │             └── Create WorkflowActionExecution (Link notificationId)
       │
       └── Update Event Status (STATUS: PROCESSED)
```

---

## 3. Workflow Actions & Delays
- Workflow actions define: `channel`, `category`, `templateName`, `delaySeconds`.
- Actions with `delaySeconds = 0` dispatch immediate notifications.
- Actions with `delaySeconds > 0` leverage Phase 14 delayed BullMQ jobs.

---

## 4. API Key Scopes
- `events:write` — Ingest business events (`POST /api/v1/events`).
- `events:read` — View event ingestion history (`GET /api/v1/events`).
- `workflows:read` — View workflow rules (`GET /api/v1/workflows`).
- `workflows:write` — Create/update/delete workflow rules (`POST /api/v1/workflows`, `PATCH`, `DELETE`).
