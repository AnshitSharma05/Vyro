# Developer SDK & Integration Experience Architecture

## 1. Executive Summary & Core Purpose
The **Official Node.js SDK** (`notification-platform-node` located in `sdk/node/`) provides a clean, ergonomic, type-safe developer abstraction over the public REST APIs.

**Core Design Principles**:
1. **Thin Client Wrapper**: Wraps public `/api/v1` REST endpoints using `X-API-Key` machine authentication.
2. **Zero Server Business Logic**: The SDK contains **no** server logic—it does not access PostgreSQL, Redis, BullMQ, Prisma, template rendering, provider selection, or preference evaluation. All business logic remains strictly centralized on the server.
3. **Resilient Retry Engine**: Automatic exponential backoff retries for transient errors (`429`, `502`, `503`, `504`, timeouts). Safe POST retries only when an `idempotencyKey` or `externalEventId` is present.
4. **Normalized Error Hierarchy**: Maps HTTP status codes to typed SDK errors (`AuthenticationError`, `RateLimitError`, `ConflictError`, `ValidationError`).
5. **Privacy & Security**: API keys are passed strictly in HTTP headers (`X-API-Key`) and are completely redacted from debug logs, error messages, and URL parameters.

---

## 2. SDK Architecture Diagram

```text
DEVELOPER APPLICATION
       │
       ▼
NOTIFICATION CLIENT (sdk/node/src/client.js)
       │
       ├── client.events         ──► EventsResource (src/resources/events.js)
       ├── client.notifications  ──► NotificationsResource (src/resources/notifications.js)
       ├── client.recipients     ──► RecipientsResource (src/resources/recipients.js)
       ├── client.preferences    ──► PreferencesResource (src/resources/preferences.js)
       ├── client.devices        ──► DevicesResource (src/resources/devices.js)
       ├── client.workflows      ──► WorkflowsResource (src/resources/workflows.js)
       └── client.webhooks       ──► WebhooksResource (src/resources/webhooks.js)
       │
       ▼
HTTP CLIENT (sdk/node/src/http.js - Native Fetch)
       │
       ├── Attach X-API-Key & Idempotency-Key Headers
       ├── Bounded Exponential Backoff Retries (Transient 429/5xx errors)
       └── Normalize Errors (src/errors.js)
       │
       ▼
PUBLIC REST API (http://localhost:5000/api/v1)
```

---

## 3. Webhook HMAC Signature Verification
`client.webhooks.verifySignature(rawPayload, signatureHeader, secret)` provides cryptographic verification of inbound webhook signatures using `crypto.timingSafeEqual` and timestamp tolerance checks to prevent replay attacks.
