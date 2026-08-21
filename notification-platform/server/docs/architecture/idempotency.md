# Idempotency & Duplicate Notification Prevention Architecture

## 1. Executive Summary & Core Purpose
In distributed network systems, network dropouts and client timeouts cause client SDKs or integrations to retry HTTP requests without knowing if the original server request succeeded.

**Phase 11** introduces a durable, project-scoped **Idempotency System** for `POST /api/v1/notifications/send`. By providing an HTTP header `Idempotency-Key: <unique-key>`, client applications guarantee that network retries resolve to the original logical notification without creating duplicate database records or BullMQ queue jobs.

---

## 2. Distinction: API Idempotency vs. Provider Retries

```text
CLIENT NETWORK LAYER (Phase 11 Idempotency)
Client sends POST /send (Idempotency-Key: order-100-key) ──► Network Failure ──► Client Retries (Same Key)
       │
       ▼
EXPRESS REST API
       └── Resolves to Existing Notification ID (No second DB row, no second BullMQ job!)

─────────────────────────────────────────────────────────────────────────────────────────────
BACKGROUND WORKER LAYER (Phase 9 Provider Retries)
BullMQ Worker ──► Nodemailer Provider (SMTP Timeout) ──► Attempt #1 (FAILED) ──► Attempt #2 (SUCCESS)
       │
       └── Logs multiple NotificationAttempt rows for the SINGLE Notification record!
```

---

## 3. Uniqueness Boundary & Scoping Strategy

The uniqueness constraint is enforced in PostgreSQL at the **project level**:
```prisma
@@unique([projectId, idempotencyKey])
```

### Why Project-Scoped?
1. **Multi-Tenant Protection**: Customers in different organizations may independently choose keys like `order-100`. Project-level scoping prevents cross-tenant collisions.
2. **API Key Rotation Resilience**: Idempotency attaches to `projectId` rather than specific API key IDs or raw key secrets. Rotating an API key does not reset project idempotency history.

---

## 4. Request Fingerprinting & Conflict Handling

To prevent key hijacking (e.g. reusing `order-100` for a password reset request), the server generates a deterministic SHA-256 fingerprint hash:

```text
Incoming Request (template, recipient, data)
       │
       ▼
Canonical JSON Serialization (Sorted Keys)
       │
       ▼
SHA-256 Digest (requestHash)
       │
       ├── Idempotency Key Exists & Hashes Match:
       │     └── Return Original Notification Metadata (HTTP 200/202 Replay)
       │
       └── Idempotency Key Exists & Hashes DIFFER:
             └── Reject with HTTP 409 Conflict (code: IDEMPOTENCY_KEY_REUSED)
```

---

## 5. Race-Condition Protection Strategy
When simultaneous concurrent requests arrive with the same `Idempotency-Key`:
1. Both requests query PostgreSQL and find no existing record.
2. Both attempt `prisma.notification.create`.
3. PostgreSQL's composite unique index `@@unique([projectId, idempotencyKey])` enforces atomic uniqueness. One request succeeds; the second receives Prisma error `P2002`.
4. The service catches `P2002`, queries the created record, validates the request hash, and safely returns the original notification.

---

## 6. HTTP Error Specification for Key Misuse
If a key is reused with different payload contents:
```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "IDEMPOTENCY_KEY_REUSED",
    "message": "The idempotency key was already used with a different request."
  }
}
```

---

## 7. Future System Roadmap
- **SDK Automatic Idempotency Header Generation**: Future client SDKs will auto-generate `crypto.randomUUID()` keys for every notification call and re-send the same key on transparent HTTP network retries.
- **Transactional Outbox Pattern**: Storing queue jobs in PostgreSQL outbox tables before Redis dispatching to handle edge-case Redis disconnects during initial notification creation.
