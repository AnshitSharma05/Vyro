# Scheduling & Delayed Notifications Architecture

## 1. Executive Summary & Core Purpose
Time-sensitive SaaS notifications (e.g., subscription expiry warnings, appointment reminders) require delayed execution.

**Phase 14** introduces support for one-time scheduled notifications using **BullMQ Delayed Jobs**, fully integrating scheduling into the existing PostgreSQL + BullMQ architecture without introducing node-cron, polling loops, or fragile in-memory `setTimeout` timers.

---

## 2. Architecture & Request Pipeline

```text
CLIENT (POST /api/v1/notifications/send with "scheduledAt": "2026-08-25T10:00:00Z")
       │
       ├── 1. Validate timezone-aware ISO-8601 timestamp (Reject past dates with 400 SCHEDULED_TIME_IN_PAST)
       ├── 2. Store Notification in PostgreSQL with status = "SCHEDULED" and scheduledAt
       ├── 3. Enqueue BullMQ delayed job: addNotificationJob({ notificationId }, { delay: ms, jobId: "scheduled:id" })
       ├── 4. Emit "notification.scheduled" event & dispatch webhooks
       └── 5. Return HTTP 202 Accepted immediately with status = "SCHEDULED"

BULLMQ DELAYED JOB EXPIRES (Job arrives at Notification Worker)
       │
       ├── 1. Fetch Notification by ID from PostgreSQL
       ├── 2. Verify status (If CANCELLED / SENT / DELIVERED ──► Exit cleanly without sending)
       └── 3. If SCHEDULED ──► Transition status to PENDING ──► Proceed to Provider Delivery Pipeline
```

---

## 3. Why BullMQ Delayed Jobs? (vs. setTimeout / Cron)

| Mechanism | Crash Resilience | Scalability | Duplication Safety |
| :--- | :--- | :--- | :--- |
| **`setTimeout`** | ❌ Lost on process restart / deploy | ❌ Limited to single node RAM | ❌ Dangerous |
| **`node-cron`** | ❌ Requires custom database polling | ❌ Complex multi-node locking | ❌ Heavy DB load |
| **BullMQ Delayed Jobs** | ✅ Persisted in Redis | ✅ Scalable worker clusters | ✅ Atomic Redis execution |

---

## 4. Timezone & Timestamp Validation Rules
- **UTC Conversion**: Input timestamps (e.g. `2026-08-25T15:30:00+05:30`) are validated as ISO-8601 and normalized to UTC `Date` objects.
- **Past Date Rejection**: Requests with `scheduledAt < Date.now()` are rejected with `HTTP 400 Bad Request` (`SCHEDULED_TIME_IN_PAST`).
- **Maximum Schedule Window**: Bounded to 365 days in the future (`SCHEDULED_TIME_TOO_FAR`).

---

## 5. Cancellation Architecture (`POST /notifications/:id/cancel`)
- **Status Guard**: Only notifications in `SCHEDULED` status can be cancelled.
- **Atomic State Update**: Updates PostgreSQL status to `CANCELLED` and sets `cancelledAt: new Date()`.
- **Job Removal**: Best-effort removes the delayed job from BullMQ queue (`removeNotificationJob`).
- **Worker Double-Check**: Even if a race condition occurs and the worker dequeues a job at the exact moment of cancellation, the worker inspects PostgreSQL status and aborts execution safely.
- **Non-Cancellable Rejection**: Requests to cancel notifications already `SENT`, `DELIVERED`, `FAILED`, or `PROCESSING` return `HTTP 409 Conflict` (`NOTIFICATION_NOT_CANCELLABLE`).
