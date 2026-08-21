# Webhooks & Delivery Events Architecture

## 1. Executive Summary & Core Concepts
Real-time lifecycle visibility is critical for high-volume Notification-as-a-Service (NaaS) applications. Polling `GET /notifications/:id` continuously creates unnecessary network overhead and DB query bloat.

**Phase 12** establishes a full-duplex webhook system that cleanly decouples:
1. **Inbound Provider Webhooks** (`Provider → Platform`): Receives post-send delivery events (`DELIVERED`, `BOUNCED`, `FAILED`, `COMPLAINED`) from email/SMS/WhatsApp providers.
2. **Outbound Customer Webhooks** (`Platform → SaaS Customer Application`): Dispatches real-time event notifications (`notification.delivered`, `notification.bounced`) to customer HTTP endpoints.

---

## 2. Inbound Provider Webhooks (`Provider → Platform`)

```text
PROVIDER (SendGrid / Mailgun / Mock Adapter)
       │
       │ POST /api/v1/webhooks/providers/mock (Header: X-Provider-Signature)
       ▼
EXPRESS INBOUND WEBHOOK CONTROLLER
       ├── 1. Read Raw Body (req.rawBody)
       ├── 2. Verify Provider HMAC SHA-256 Signature (401 Unauthorized if invalid)
       ├── 3. Parse & Normalize Payload (SENT, DELIVERED, FAILED, BOUNCED, COMPLAINED)
       ├── 4. Deduplicate via Composite Unique Index @@unique([provider, providerEventId])
       ├── 5. Update Notification Status in PostgreSQL
       ├── 6. Dispatch Customer Webhook Jobs to Queue ("webhook-deliveries")
       └── 7. Return HTTP 200 OK (Immediate Provider Acknowledgment)
```

### Signature Verification & Security
Inbound provider endpoints are unauthenticated public routes (not requiring JWT or `X-API-Key`). Security is enforced by calculating `HMAC_SHA256(providerSecret, req.rawBody)` and comparing it against `X-Provider-Signature` using `crypto.timingSafeEqual`.

---

## 3. Outbound Customer Webhooks (`Platform → Customer App`)

```text
SYSTEM LIFE-CYCLE EVENT (e.g. DELIVERED, BOUNCED, FAILED)
       │
       ▼
Query Active Webhooks for Project (WHERE projectId = X AND active = true)
       │
       ▼
Enqueue Webhook Delivery Jobs to Queue ("webhook-deliveries")
       │
       ▼
STANDALONE WEBHOOK WORKER (src/workers/webhook.worker.js)
       ├── 1. Read Customer Webhook URL & Secret
       ├── 2. SSRF Destination Validation (HTTP/HTTPS only, blocks loopback/private IPs)
       ├── 3. Construct Standard Envelope (id, event, createdAt, data)
       ├── 4. Sign Payload: X-Notification-Signature = HMAC_SHA256(secret, timestamp + "." + body)
       ├── 5. Dispatch HTTP POST (5s Timeout)
       ├── 6. Handle Response (2xx = SUCCESS, 5xx/Timeout = Retryable, 4xx = Non-Retryable)
       └── 7. Log WebhookDelivery Attempt in PostgreSQL
```

### Standard Webhook Payload Envelope
```json
{
  "id": "evt_uuid_101",
  "event": "notification.delivered",
  "createdAt": "2026-08-21T09:00:00.000Z",
  "data": {
    "notificationId": "notif_uuid_202",
    "projectId": "proj_uuid_303",
    "channel": "EMAIL",
    "recipient": "user@example.com",
    "status": "DELIVERED"
  }
}
```

### Outbound Signature Verification for Customers
Customer applications verify authenticity using headers included in every outbound webhook POST:
- `X-Notification-Signature`: `HMAC_SHA256(webhookSecret, timestamp + "." + rawBodyString)`
- `X-Notification-Timestamp`: Unix epoch timestamp string
- `X-Notification-Delivery-Id`: Unique `WebhookDelivery` log ID

---

## 4. At-Least-Once Delivery & Idempotency Rules
The platform provides **At-Least-Once Delivery** guarantees:
- Network failures after customer processing but before HTTP response delivery trigger BullMQ retries.
- Customer webhook receivers **must implement event deduplication** using the top-level `id` (`eventId`).

---

## 5. Security & SSRF Protection
- **SSRF Validation**: Outbound webhook URLs pass through `validateWebhookUrl()` before dispatch, blocking restricted loopback (`127.0.0.1`, `localhost`) and private IP ranges (`10.x`, `172.16-31.x`, `192.168.x`, `169.254.x`).
- **Secret Isolation**: Customer webhook secrets (`whsec_...`) are generated securely and returned **once** upon creation. They are never returned in list endpoints or logged in server output.
