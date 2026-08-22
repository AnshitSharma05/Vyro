# Changelog

All notable changes to the Notification Platform project will be documented in this file.

## [1.0.0] - 2026-08-22

### Added
- **Phase 24 — Performance, Load Testing & Scalability Validation**:
  - Integrated `autocannon` HTTP benchmarking framework into `tests/load/`.
  - Scenario scripts: `notifications.load.js`, `events.load.js`, `quotas.load.js`, `idempotency.load.js`, `rate-limit.load.js`, and master runner `run-all-load-tests.js`.
  - `npm run test:load` workspace script.
  - Manual GitHub Actions performance workflow `.github/workflows/performance.yml` (`workflow_dispatch`).
  - Architecture documentation in `docs/performance-and-scalability.md`.
- **Phase 23 — Deployment, CI/CD & Production Operations**:
  - Multi-stage Node.js `Dockerfile` for backend server and background workers.
  - `docker-compose.yml` for local multi-container orchestration (`postgres`, `redis`, `server`, `worker`, `client`).
  - `.github/workflows/ci.yml` GitHub Actions pipeline with PostgreSQL and Redis service containers.
  - Deployment smoke test script (`server/scripts/smoke-test.js`).
  - Comprehensive deployment documentation in `docs/deployment.md`.
- **Phase 22 — Production Hardening, Security & Reliability**:
  - Centralized Zod startup environment validation (`server/src/config/env.js`).
  - Native HTTP security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `HSTS`) and CORS origin rules.
  - `X-Request-ID` tracing middleware across requests, response headers, Pino logs, and error responses.
  - Liveness (`/health/live`) and Readiness (`/health/ready`) health checks.
  - Idempotent graceful shutdown engine for `SIGTERM`/`SIGINT`.
- **Phase 21 — Usage Metering, Quotas & Billing-Ready Architecture**:
  - Subscription plans (`FREE`, `PRO`, `BUSINESS`) with metered metrics (`NOTIFICATIONS`, `EVENTS`, `API_REQUESTS`) and resource quotas.
  - Monthly UTC billing period tracking in `OrganizationUsage`.
  - Concurrency-safe atomic database increments and quota checking (`QUOTA_EXCEEDED` HTTP 429).
