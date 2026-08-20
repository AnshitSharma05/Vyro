# Notification Engine & Delivery Architecture

## 1. Overview & Core Architecture
The **Notification Engine** is the core execution pipeline of the Notification-as-a-Service (NaaS) platform. It allows client applications to trigger notifications by specifying a template name identifier (e.g., `order-confirmed`) and supplying dynamic variable data payloads (`{ name: "Anshit", orderId: "ORD-123" }`).

In **Phase 6**, delivery is executed **synchronously**:

```text
Client Application (X-API-Key: np_live_...)
       │
       ▼
API Key Middleware (Resolves Project & Organization)
       │
       ▼
POST /api/v1/notifications/send
       │
       ▼
Notification Service
  ├── 1. Resolve Project Template (by Name + Project ID)
  ├── 2. Validate Channel & Recipient (Email Regex Validation)
  ├── 3. Render Subject & Body Snapshot (TemplateRenderer)
  ├── 4. Insert Notification Record (Status: PROCESSING)
  ├── 5. Select Provider (ProviderFactory -> EmailProvider)
  ├── 6. Dispatch Payload via Nodemailer (SMTP / JSON Transport)
  ├── 7. Insert NotificationAttempt Record (SUCCESS / FAILED)
  └── 8. Update Notification Status (SENT / FAILED) & Return API Response
```

---

## 2. Separate Authentication & Authorization Paths

| Path | Auth Header | Principal | Context Attached | Target Endpoint |
| :--- | :--- | :--- | :--- | :--- |
| **Client Machine** | `X-API-Key: np_live_...` | Machine Application | `req.project` | `POST /api/v1/notifications/send`<br>`GET /api/v1/notifications` |
| **Human Dashboard** | `Authorization: Bearer <JWT>` | Dashboard User | `req.user` | `GET /api/v1/projects/:projectId/notifications` |

### Tenant Isolation Rule
The client machine endpoint derives `projectId` exclusively from `req.project.id` (established via the `X-API-Key`). The client cannot request notifications for another project.

---

## 3. Template Resolution & Variable Rendering Integration
1. **Template Scope**: Templates are queried strictly by `(name, projectId)`. Template names are unique per project, preventing cross-tenant template access.
2. **Variable Substitution**: Rendered using `templateRenderer.renderTemplate({ subject, body }, data)`.
3. **Missing Variable Protection**: If the template requires `{{orderId}}` and `data` is missing `orderId`, rendering throws a `ValidationError` (400 Bad Request), preventing delivery of broken messages.

---

## 4. Content Snapshotting & Historical Audit Integrity
When a notification record is created in PostgreSQL (`notifications` table), the fully rendered `subject`, `body`, and template `data` are stored inside the `metadata` JSON column.

### Rationale
If a developer alters a template later (e.g. changing template text from v1 to v2) or deletes a template, historical notification records **retain their exact rendered snapshot**. Audit logs remain accurate and reproducible.

---

## 5. Recipient Validation Rules by Channel
* **EMAIL**: Validated against standard email regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`).
* **SMS / WHATSAPP**: Validated against basic phone number format (`/^\+?[0-9]{7,15}$/`).
* **PUSH**: Validated as non-empty token string.

---

## 6. Provider Abstraction & Factory Layer

```text
NotificationService ──► ProviderFactory ──► BaseNotificationProvider ──► EmailProvider (Nodemailer)
                                                                      ──► SmsProvider (422 Unconfigured)
                                                                      ──► WhatsappProvider (422 Unconfigured)
                                                                      ──► PushProvider (422 Unconfigured)
```

### Provider Contract
Every provider inherits from `BaseNotificationProvider` and implements:
```js
async send({ recipient, subject, body, metadata })
```

### Email Delivery (Nodemailer)
- Backed by Nodemailer (`nodemailer.client.js`).
- Uses environment variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`.
- In test environments without live SMTP credentials, falls back to in-memory JSON transport.

---

## 7. Delivery Attempt Tracking & Non-Transactional SMTP Boundaries
External SMTP networks cannot participate in database transactions. Therefore:
1. `Notification` is inserted with `status = PROCESSING`.
2. Provider delivery is invoked.
3. Upon completion, a `NotificationAttempt` record is created (`status = SUCCESS` or `FAILED`).
4. `Notification` status is updated to `SENT` (`sentAt = now()`) or `FAILED` (`failedAt = now()`).

---

## 8. Security & Logging Rules
- **No Secret Logging**: Pino loggers filter headers (`X-API-Key`, `Authorization`) and credentials (`SMTP_PASSWORD`).
- **No Stack Trace Leakage**: External SMTP or network errors are sanitized into structured API error responses.

---

## 9. Future Architecture Roadmap
* **Phase 8 (BullMQ Queues & Background Workers)**: Asynchronous queueing (`202 Accepted` response).
* **Phase 9 (Retry Logic & Exponential Backoff)**: Automatic retries on worker failures.
* **Phase 11 (Idempotency System)**: `Idempotency-Key` header handling.
