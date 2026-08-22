# Changelog

All notable changes to the Notification Platform project will be documented in this file.

## [1.0.0] - 2026-08-22

### Added
- **Phase 25 — Final SaaS Polish, Developer Experience & Portfolio Release**:
  - Integration examples suite in `examples/`: `basic-email.js`, `template-notification.js`, `event-trigger.js`, `idempotent-notification.js`, `webhook-verification.js`, and `curl-api.sh`.
  - Comprehensive documentation suite in `docs/`: `architecture.md`, `api.md`, `sdk.md`, `security.md`, `performance.md`, `interview-preparation.md`, `technical-debt.md`, `portfolio.md`, and `resume-bullets.md`.
  - Polished OpenAPI 3.0 specification (`server/docs/api/openapi.yaml`).
  - Production-grade root `README.md` with Mermaid sequence diagrams, quickstart guides, and performance benchmarks.
- **Phase 24 — Performance, Load Testing & Scalability Validation**:
  - Integrated `autocannon` HTTP benchmarking framework into `tests/load/`.
  - Scenario scripts: `notifications.load.js`, `events.load.js`, `quotas.load.js`, `idempotency.load.js`, `rate-limit.load.js`, and master runner `run-all-load-tests.js`.
  - `npm run test:load` workspace script.
  - Architecture documentation in `docs/performance-and-scalability.md`.
- **Phase 23 — Deployment, CI/CD & Production Operations**:
  - Multi-stage Node.js `Dockerfile` for backend server and background workers.
  - `docker-compose.yml` for local multi-container orchestration (`postgres`, `redis`, `server`, `worker`, `client`).
  - `.github/workflows/ci.yml` GitHub Actions pipeline with PostgreSQL and Redis service containers.
  - Deployment smoke test script (`server/scripts/smoke-test.js`).
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
- **Phases 1 - 20**:
  - Complete backend & frontend modules including Database Architecture, Authentication, Organizations, API Keys, Templates, Notification Engine, Redis & BullMQ Workers, Retry Logic, Rate Limiting, Idempotency, Webhooks, Analytics, Scheduling, Multi-Channel Providers, Provider Failover, RBAC, Recipients & Devices, Events & Workflows, and Node.js SDK.
