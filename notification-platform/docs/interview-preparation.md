# Technical Interview Preparation Guide (System Design & Architecture)

This document answers key architecture, distributed systems, and backend design questions regarding the Notification Platform.

---

### Q1: Why use PostgreSQL?
**Answer**: PostgreSQL provides strong ACID compliance, relational integrity (foreign keys, cascading rules), complex filtering/pagination capabilities, and JSONB support. It reliably handles transactional state for users, organizations, templates, and metered usage quotas.

### Q2: Why Prisma ORM?
**Answer**: Prisma delivers type-safe database queries, automated migration management (`prisma migrate deploy`), schema readability, and protection against SQL injection attacks without raw query string boilerplate.

### Q3: Why Redis?
**Answer**: Redis operates in-memory with sub-millisecond read/write latencies. It powers BullMQ job queues, atomic sliding-window rate limiting counters, and transient caching.

### Q4: Why BullMQ?
**Answer**: BullMQ provides robust delayed job scheduling, automatic exponential backoff retries, concurrency control, job deduplication, and dead-letter queue management on top of Redis.

### Q5: Why asynchronous notification processing?
**Answer**: Synchronous notification dispatch forces HTTP client connections to wait for third-party provider API calls (SMTP, SMS gateways, FCM), which often take 500ms–5000ms or fail transiently. Asynchronous queueing decouples API ingestion (~6ms latency) from provider delivery.

### Q6: Why separate API and worker processes?
**Answer**: Separating API servers (`src/server.js`) and background workers (`src/workers/worker.js`) prevents heavy background job execution or provider socket timeouts from consuming event loop capacity needed to handle incoming web traffic. Both processes can scale horizontally independently.

### Q7: How does retry work?
**Answer**: BullMQ handles retries using exponential backoff with jitter (`backoff: { type: 'exponential', delay: 1000 }`). Failed provider dispatches record a `NotificationAttempt` log and increment the attempt count up to `maxAttempts`.

### Q8: How does idempotency work?
**Answer**: Clients send an `Idempotency-Key` header. The system checks Redis/PostgreSQL for a pre-existing record under that key. If found, the cached response is returned immediately. If not found, an atomic lock is acquired, the notification is created, and the response is saved.

### Q9: How does tenant isolation work?
**Answer**: Multi-tenant isolation is enforced at the database level. Middleware extracts `organizationId` from authenticated JWTs or API keys, and every Prisma query explicitly scopes by `where: { organizationId }`.

### Q10: How do API keys work & why hash them?
**Answer**: API keys use a prefix format (`np_live_...`). Raw keys are shown to the user once upon creation. The database stores SHA-256 hashes (`ApiKey.keyHash`). Comparing hashed credentials via `crypto.timingSafeEqual` prevents database compromise leaks and timing attacks.

### Q11: Why JWT for dashboard authentication?
**Answer**: JWTs enable stateless authentication for single-page applications (React dashboard), encoding user identity and permissions without requiring session lookup queries on every dashboard page render.

### Q12: How does RBAC work?
**Answer**: `OrganizationMember` records map users to roles (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`). Middleware enforces granular permissions before executing mutating operations.

### Q13: How does provider abstraction work?
**Answer**: Providers implement a common unified interface (`send({ recipient, content })`). The `ProviderRouter` normalizes request data and delegates dispatch to specific driver implementations (Nodemailer, Twilio mock, FCM mock).

### Q14: How does provider failover work?
**Answer**: If a primary provider throws a retryable error, `ProviderRouter` catches the exception, logs a failed attempt, and attempts dispatch through configured fallback providers before re-throwing for BullMQ retry.

### Q15: How does rate limiting work?
**Answer**: Rate limiting uses a Redis sliding-window counter per organization/IP. Excess requests return HTTP 429 `TOO_MANY_REQUESTS`.

### Q16: How does quota enforcement work?
**Answer**: `QuotaService` checks current billing period usage against the organization's plan limit (`PlanLimit`). Over-quota requests immediately return HTTP 429 `QUOTA_EXCEEDED`.

### Q17: Why is delivery at-least-once?
**Answer**: Network partitions between workers and external gateways mean a provider may successfully deliver a message even if the worker fails to receive the network ACK. Therefore, distributed delivery guarantee is strictly **at-least-once**.

### Q18: Why can't exactly-once external delivery be guaranteed?
**Answer**: Due to the Two Generals' Problem, no distributed system can guarantee exactly-once delivery over unreliable external third-party networks (SMTP, Telecom networks).

### Q19: What happens if Redis goes down?
**Answer**: Express API endpoints degrade gracefully by failing health checks (`/health/ready` returns 503). BullMQ workers pause processing until Redis reconnects.

### Q20: What happens if PostgreSQL goes down?
**Answer**: Readiness probe fails (`/health/ready` returns 503). Database transactions roll back safely.

### Q21: What happens if SMTP times out?
**Answer**: The worker catches socket timeout exceptions, records a failed `NotificationAttempt`, and BullMQ schedules an exponential backoff retry.

### Q22: How does graceful shutdown work?
**Answer**: Signal handlers (`SIGTERM`/`SIGINT`) stop Express server listeners, wait for active BullMQ worker jobs to complete, close Redis connections, and disconnect Prisma PostgreSQL clients cleanly.

### Q23: How can the system scale horizontally?
**Answer**: API servers are stateless and scale horizontally behind Nginx/ALB. Workers scale independently by increasing container instances connected to shared Redis and PostgreSQL databases.

### Q24: What is the primary bottleneck?
**Answer**: Database connection pool capacity under extreme concurrency, and single-node Redis I/O throughput at heavy scale.

### Q25: How would you scale to 10x traffic?
**Answer**: Increase API & worker container replicas, tune Prisma `connection_limit`, enable Redis connection pooling, and add database read replicas for analytics queries.

### Q26: How would you scale to 100x traffic?
**Answer**: Implement Redis Cluster sharding, PostgreSQL table partitioning by `organizationId`/`createdAt`, pre-aggregated usage analytics tables, and distributed Kafka/Pulsar event streaming.

### Q27: How would you introduce billing?
**Answer**: Integrate Stripe webhooks listening for invoice payment events to dynamically update `Plan` tiers in PostgreSQL upon monthly renewal.

### Q28: How would you introduce additional providers?
**Answer**: Implement a new class implementing the unified `ProviderInterface` and register it in `ProviderFactory`.

### Q29: How would you support additional SDK languages?
**Answer**: Generate client SDKs (Python, Go, Java) from the authoritative OpenAPI 3.0 specification (`openapi.yaml`).

### Q30: Why a modular monolith over microservices?
**Answer**: A modular monolith eliminates network hop latency, distributed tracing overhead, deployment complexity, and dual-write transactional issues while preserving clean domain boundaries.
