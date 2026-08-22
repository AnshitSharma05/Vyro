# Architecture Decision Records (ADRs)

## ADR 001: Modular Monolith vs. Microservices Architecture
- **Status**: Accepted
- **Context**: The platform requires clean component isolation across authentication, organization management, templates, notification routing, and analytics.
- **Decision**: Architect the system as a **Modular Monolith** with separate process execution for Express API web traffic and BullMQ background workers sharing a primary PostgreSQL database and Redis cluster.
- **Consequences**: Eliminates network hop latency, distributed tracing overhead, microservice deployment complexity, and dual-write transactional consistency issues while maintaining domain module boundaries.

---

## ADR 002: PostgreSQL with Prisma ORM for Primary Persistence
- **Status**: Accepted
- **Context**: Requires strict relational integrity, ACID compliance, complex multi-tenant query filtering, and automated schema migrations.
- **Decision**: Select PostgreSQL 15 managed via Prisma ORM.
- **Consequences**: Type-safe database queries, automated migration management (`prisma migrate deploy`), schema clarity, and relational integrity.

---

## ADR 003: Redis & BullMQ for Asynchronous Queueing
- **Status**: Accepted
- **Context**: Synchronous notification dispatch forces HTTP client connections to wait for third-party provider network latency (500ms–5000ms).
- **Decision**: Use Redis 7 as in-memory data structure store powering BullMQ background queues (`notification-queue`, `event-queue`).
- **Consequences**: Reduces API ingestion latency to ~6ms (p50). Isolates external provider network failures from HTTP API availability.

---

## ADR 004: At-Least-Once Delivery Semantics
- **Status**: Accepted
- **Context**: Distributed networks between worker processes and third-party delivery gateways (SMTP, SMS gateways) cannot guarantee exactly-once delivery due to network ACK partitions.
- **Decision**: Enforce strict **at-least-once** delivery semantics supported by API request idempotency key deduplication.
- **Consequences**: Prevents message loss. Requires customer webhook endpoints to handle idempotent event processing using `eventId`.

---

## ADR 005: SHA-256 Hashed API Key Authentication
- **Status**: Accepted
- **Context**: Server-to-server machine authentication requires secure API key credentials.
- **Decision**: Present raw API key (`np_live_...`) to user ONCE upon creation. Store only the SHA-256 hash (`ApiKey.keyHash`) in database and evaluate via `crypto.timingSafeEqual`.
- **Consequences**: Protects machine credentials against database compromise and timing attacks.
