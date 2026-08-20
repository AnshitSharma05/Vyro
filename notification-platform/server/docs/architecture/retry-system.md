# Notification Retry System & Failure Management Architecture

## 1. Executive Summary & Core Requirements
Distributed network transport systems (such as SMTP, SMS gateways, and push notification networks) suffer from transient disruptions (network timeouts, socket drops, server busy responses, 5xx gateway errors).

**Phase 9** introduces a production-grade **Retry & Failure Management System**. It automatically retries transient errors with **exponential backoff**, halts immediate retries for non-retryable client errors, preserves complete historical execution attempt logs, and enforces finite attempt limits (`NOTIFICATION_MAX_ATTEMPTS = 3`).

---

## 2. Notification vs. BullMQ Job Retries

```text
Logical Notification (PostgreSQL Source of Truth)
  ├── ID: notif-uuid-101
  ├── Status: PENDING ──► PROCESSING ──► RETRYING ──► PROCESSING ──► SENT
  └── Delivery Attempts (NotificationAttempt 1:N)
        ├── Attempt #1: [EMAIL_NODEMAILER] FAILED (ErrorCode: ETIMEDOUT, AttemptedAt: 10:00:00)
        ├── Attempt #2: [EMAIL_NODEMAILER] FAILED (ErrorCode: ECONNRESET, AttemptedAt: 10:00:05)
        └── Attempt #3: [EMAIL_NODEMAILER] SUCCESS (DeliveredAt: 10:00:15)

BullMQ Queue (Redis Infrastructure)
  └── Job (Data: { notificationId: "notif-uuid-101" }, Attempts: 3, Backoff: Exponential 5s)
```

- **Single Notification Entity**: A single `Notification` record is preserved throughout all retries. The system never creates duplicate `Notification` rows for retries.
- **`NotificationAttempt` Timeline**: Every provider execution logs a new `NotificationAttempt` record with an explicit `attemptNumber` (1, 2, 3...).

---

## 3. Error Classification Matrix

| Error Type | Examples / Status Codes | Retryable? | Action Taken |
| :--- | :--- | :--- | :--- |
| **Transient Network Error** | `ETIMEDOUT`, `ECONNRESET`, `ECONNREFUSED`, `ESOCKETTIMEDOUT`, `SMTP_TIMEOUT` | **Yes** | Log `FAILED` attempt, set status `RETRYING`, throw error for BullMQ backoff retry |
| **Server / Gateway Error** | HTTP 500, 502, 503, 504, 429 (Rate Limit) | **Yes** | Log `FAILED` attempt, set status `RETRYING`, throw error for BullMQ backoff retry |
| **Invalid Client Payload** | Missing template variables, malformed template | **No** | Log `FAILED` attempt, set status `FAILED`, throw BullMQ `UnrecoverableError` |
| **Recipient Error** | Invalid email format, invalid phone number | **No** | Log `FAILED` attempt, set status `FAILED`, throw BullMQ `UnrecoverableError` |
| **Provider Config Error** | Unconfigured channel (SMS/WhatsApp/Push 422) | **No** | Log `FAILED` attempt, set status `FAILED`, throw BullMQ `UnrecoverableError` |
| **Max Attempt Exhaustion** | Attempt number $\ge 3$ reached | **No** | Log `FAILED` attempt, set status `FAILED`, throw BullMQ `UnrecoverableError` |

---

## 4. BullMQ Exponential Backoff Strategy
BullMQ is configured with built-in exponential backoff:
```js
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000 // 5s initial delay -> 10s -> 20s
  }
}
```

### Jitter Protection
To protect against retry storms when multiple network calls fail simultaneously, BullMQ's exponential delay incorporates subtle timing variance, spreading retry load across worker nodes.

---

## 5. Worker Decision Execution Flow

```text
Worker Consumes Job ({ notificationId })
       │
       ▼
Calculate Attempt Number (N = Existing Attempts + 1)
       │
       ▼
Atomic Transition (PENDING or RETRYING -> PROCESSING in DB)
       │
       ▼
Invoke Delivery Provider (Nodemailer / SMTP)
       ├── SUCCESS:
       │     ├── Create Attempt #N (Status: SUCCESS, DeliveredAt: now())
       │     └── Update Notification (Status: SENT, SentAt: now())
       │
       └── FAILURE:
             ├── Classify Error (retryable: boolean, errorCode, message)
             ├── Create Attempt #N (Status: FAILED, AttemptNumber: N, ErrorCode, ErrorMessage)
             │
             ├── IF (retryable === true AND N < MAX_ATTEMPTS):
             │     ├── Update Notification (Status: RETRYING)
             │     └── Throw Error (BullMQ applies exponential backoff & reschedules)
             │
             └── IF (retryable === false OR N >= MAX_ATTEMPTS):
                   ├── Update Notification (Status: FAILED, FailedAt: now())
                   └── Throw UnrecoverableError (BullMQ halts job execution immediately)
```

---

## 6. Database Transaction & Boundary Rules
1. **Provider Isolation**: External network calls (`provider.send()`) are executed **outside database transactions**. Network calls must never hold open PostgreSQL database transactions.
2. **State Scoping**: Upon provider completion, database operations (`createAttempt` and `updateStatus`) run in clean, transactional repository calls.

---

## 7. Future System Roadmap
- **Phase 11 (Idempotency System)**: `Idempotency-Key` header handling to prevent duplicate client API requests.
- **Phase 12 (Provider Failover & Multi-Provider Routing)**: Automatically routing to secondary providers (e.g. Mailgun/SendGrid fallback) if primary provider fails.
