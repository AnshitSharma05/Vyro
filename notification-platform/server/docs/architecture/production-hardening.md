# Production Hardening, Security & Reliability Architecture

## 1. Executive Summary & Core Purpose
A production-grade Notification-as-a-Service (NaaS) platform must guarantee high availability, strict security defaults, and graceful error recovery under unexpected infrastructure failures.

**Phase 22** hardens the platform architecture by implementing:
1. **Centralized Environment Validation (`src/config/env.js`)**: Zod-validated startup configuration. Fails fast if required variables are missing or insecure in production (`NODE_ENV === 'production'`).
2. **Security Headers, CORS & Log Redaction (`src/config/security.js`)**: Helmet security headers, explicit CORS allowed origin policies (`CORS_ALLOWED_ORIGINS`), JSON body payload size limits (100KB), and Pino log redaction for API keys, bearer tokens, passwords, and secrets.
3. **Request ID Tracing (`src/middlewares/request-id.middleware.js`)**: Sanitizes or generates `X-Request-ID`, propagating it across HTTP request contexts, response headers, Pino log objects, and error payloads.
4. **Centralized Production Error Handler (`src/middlewares/error-handler.middleware.js`)**: Redacts stack traces and database/SQL error details in production responses, returning standard `{ success: false, error: { code, message, requestId } }`.
5. **Liveness & Readiness Health Checks (`src/modules/health/`)**:
   - `GET /health/live`: Process liveness (200 OK).
   - `GET /health/ready`: Deep readiness probe checking PostgreSQL connection (`$queryRaw`) and Redis ping (`503 Service Unavailable` if degraded).
6. **Idempotent Graceful Shutdown (`src/shared/shutdown/graceful-shutdown.js`)**: Handles `SIGTERM`/`SIGINT` signals by closing HTTP listener, pausing BullMQ workers, disconnecting Redis/Prisma (`prisma.$disconnect()`), and terminating cleanly within a 10s grace period.

---

## 2. Startup & Request Pipeline Architecture

```text
HTTP REQUEST
       │
       ▼
REQUEST ID MIDDLEWARE (src/middlewares/request-id.middleware.js)
       │
       ├── Validate/Sanitize X-Request-ID (or generate uuid)
       ├── Attach req.id & Res Header (X-Request-ID)
       │
       ▼
SECURITY MIDDLEWARE (src/config/security.js)
       │
       ├── Helmet Security Headers
       ├── CORS Allowed Origins Filter
       ├── Express JSON Limit (100KB)
       │
       ▼
APPLICATION ROUTER & SERVICES
       │
       ├── Health Probes (/health/live, /health/ready)
       ├── API Key / Auth Validation
       ├── Business Logic (Orchestration, Quotas, Preferences)
       │
       ▼
CENTRALIZED ERROR HANDLER (src/middlewares/error-handler.middleware.js)
       │
       ├── Redact Stack Traces / Secrets in Production
       ├── Log Structured Error with Request ID (Pino Redacted)
       └── Return Standard HTTP Error Object
```

---

## 3. Health Probes
- `GET /health/live` — Liveness probe (200 OK when process is running).
- `GET /health/ready` — Readiness probe (200 OK when PostgreSQL and Redis are healthy, 503 Service Unavailable if degraded). Never leaks credentials or connection strings.

---

## 4. Graceful Shutdown Flow
On `SIGTERM` or `SIGINT`:
1. Stop accepting new HTTP requests (`server.close()`).
2. Pause BullMQ workers and queues.
3. Disconnect Redis client.
4. Disconnect Prisma PostgreSQL client (`prisma.$disconnect()`).
5. Terminate cleanly within a 10s grace period.
