# Notification History, Delivery Attempts & Observability Architecture

## 1. Overview & Conceptual Architecture
The Notification History and Delivery Attempt module provides complete visibility into every notification request processed by the platform.

### Core Distinction: Notification vs. NotificationAttempt

```text
Notification (Task Header)
  ├── ID: UUID
  ├── Project ID: UUID (Strict Tenant Isolation)
  ├── Channel: EMAIL | SMS | WHATSAPP | PUSH
  ├── Recipient: user@example.com
  ├── Status: PENDING | PROCESSING | SENT | FAILED | CANCELLED
  ├── Metadata: { subject, body, templateName, templateData } (Content Snapshot)
  └── Attempts (Chronological Timeline 1:N)
        ├── Attempt #1: [EMAIL_NODEMAILER] FAILED (ErrorCode: SMTP_TIMEOUT)
        └── Attempt #2: [EMAIL_NODEMAILER] SUCCESS (DeliveredAt: 2026-08-20T22:00:00Z)
```

1. **`Notification`**: Higher-level domain entity representing the overall notification delivery intent.
2. **`NotificationAttempt`**: Execution log capturing each discrete attempt to deliver the notification via an underlying transport provider.

---

## 2. Historical Content Snapshot Strategy
When a notification is dispatched, its fully rendered `subject` and `body` along with template `data` payload are stored inside `Notification.metadata`.

### Audit Integrity Guarantee
If a developer alters a template later (e.g. updating template text from v1 to v2) or hard-deletes the template, historical notification records **retain their exact rendered snapshot**. Audit logs remain accurate and reproducible.

---

## 3. Provider Error Sanitization & Truncation
When a provider execution attempt fails:
- The error message is sanitized (stripping any raw SMTP credentials, tokens, or passwords).
- The string is truncated to a maximum of **500 characters** with an appended ellipsis (`...`).
- This prevents unbounded error payload dumps from polluting or bloating database storage.

---

## 4. Tenant Isolation & Query Pagination

### Project-Scoped Database Queries
Every repository query strictly enforces `WHERE projectId = projectIdFromAuthContext AND id = notificationId`. Cross-project notification retrieval is rejected at the database level.

### Safe Offset Pagination Bounds
- `page`: Minimum 1.
- `limit`: Capped at a maximum of 100 (Default: 20).
- Default sorting: `createdAt DESC` (Newest notifications first).

### Database Indexes
- `@@index([projectId, createdAt(sort: Desc)])`
- `@@index([projectId, status])`
- `@@index([projectId, channel])`
- `@@index([notificationId, attemptedAt(sort: Asc)])`

---

## 5. Preparation for Asynchronous Queues & Worker Retries

### Phase 8 Readiness (BullMQ & Redis)
In Phase 8, notification creation will return `202 Accepted` while enqueuing jobs into BullMQ. Workers will reuse `notificationRepository.createAttempt` and `notificationRepository.updateStatus` without requiring changes to database models or service contracts.

### Phase 9 Readiness (Exponential Retries)
The `1:N` relationship between `Notification` and `NotificationAttempt` inherently supports multi-attempt retries. When worker retries are introduced, attempts 1, 2, 3... will append to `NotificationAttempt` sequentially while updating `Notification.status` to `RETRYING` $\rightarrow$ `SENT` or `FAILED`.
