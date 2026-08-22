# Security Architecture & Defense-in-Depth

## 1. Overview & Threat Model
The Notification Platform protects machine credentials, customer PII (emails, phone numbers), notification data, and organization settings through defense-in-depth security controls.

---

## 2. Authentication & Credential Security

### Machine Authentication (API Keys)
- Raw API keys (`np_live_...`) are generated using cryptographically secure random bytes (`crypto.randomBytes(32)`).
- **Raw keys are presented to the user ONCE upon creation and never stored in plain text**.
- The database stores only the SHA-256 hash (`ApiKey.keyHash`). When an API key is presented in `X-API-Key`, it is hashed and compared using constant-time comparison (`crypto.timingSafeEqual`).

### User Authentication (JWT & Passwords)
- Passwords are hashed using `bcrypt` with a cost factor of 10.
- JWT tokens (`HS256`) expire after 24 hours and contain explicit `userId` and `organizationId` claims.

---

## 3. Tenant Isolation & RBAC
- **Strict Query Scoping**: Every database lookup filters by `organizationId` or `projectId` extracted directly from the verified token context.
- **RBAC Roles**: Fine-grained role checks (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`) enforce permission boundaries across organization settings, project management, and template editing.

---

## 4. Input Sanitization & Payload Protection
- **Zod Schema Validation**: All incoming API payloads are strictly validated prior to processing.
- **Payload Limits**: HTTP body parser enforces a 100KB limit to prevent Memory DoS attacks.
- **Pino Log Redaction**: Sensitive fields (`x-api-key`, `authorization`, `password`, `secret`, `token`, `smtpPass`) are automatically redacted from Pino logger outputs.
- **Production Error Redaction**: 500 internal server error responses conceal internal SQL tracebacks and raw stack traces in production environments, attaching a traceable `requestId`.

---

## 5. Webhook Security
- Webhook payloads delivered to customer endpoints are signed using HMAC SHA-256 (`X-Webhook-Signature`).
- Timestamp propagation protects customer endpoints against replay attacks.
