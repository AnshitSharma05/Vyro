# Rate Limiting & Abuse Protection Architecture

## 1. Executive Summary & Core Requirements
High-volume SaaS notification platforms are vulnerable to request floods, credential brute-forcing, spam attacks, and infrastructure exhaustion. 

**Phase 10** establishes a distributed **Redis-based Rate Limiting Architecture**. It enforces strict quotas **before expensive operations** (before request validation, PostgreSQL database writes, or BullMQ queue enqueueing), preventing malicious traffic from consuming server resources.

---

## 2. Protection Boundaries & Execution Order

```text
CLIENT REQUEST
      │
      ├── Public Endpoint (e.g. POST /api/v1/auth/login)
      │     └── 1. IP Rate Limiter Middleware (rate_limit:auth:login:{ip}:{window})
      │           └── 2. Request Validation & Auth Service Execution
      │
      └── Machine Endpoint (e.g. POST /api/v1/notifications/send)
            ├── 1. API Key Authentication (Resolves req.project)
            ├── 2. Project Rate Limiter Middleware (rate_limit:notifications:{projectId}:{window})
            │     └── REJECTS HERE WITH HTTP 429 IF QUOTA EXCEEDED
            ├── 3. Zod Request Validation
            ├── 4. PostgreSQL Notification Record Creation (status: PENDING)
            ├── 5. BullMQ Queue Enqueueing
            └── 6. Return HTTP 202 Accepted
```

---

## 3. Rate Limiting Categories & Key Design

| Category | Endpoint Scope | Limiting Identity | Key Format | Default Limit |
| :--- | :--- | :--- | :--- | :--- |
| **Notification API** | `POST /api/v1/notifications/send` | `projectId` | `rate_limit:notifications:{projectId}:{window}` | 100 req / 60s |
| **Authentication Login** | `POST /api/v1/auth/login` | Client IP | `rate_limit:auth:login:{ip}:{window}` | 5 attempts / 60s |

### Security & Privacy Rule
Raw API keys, hashes, JWT tokens, or passwords are **NEVER** stored in Redis rate limit keys. Rate limits for machine endpoints tie to the immutable `projectId`. Consequently, rotating API keys does not reset a project's rate limit quota.

---

## 4. Redis Fixed-Window Algorithm
The platform uses an atomic Redis `INCR` + `EXPIRE` algorithm:
1. Compute window timestamp: `windowTimestamp = Math.floor(Date.now() / (windowSeconds * 1000))`
2. Execute `INCR rate_limit:notifications:{projectId}:{windowTimestamp}`
3. If `count === 1` (first request in current window): `EXPIRE key windowSeconds`
4. Query `TTL key` to derive remaining seconds until reset.
5. If `count > limit`: Set `Retry-After: <resetSeconds>` and reject with HTTP 429.

### Window Boundary Tradeoff
Fixed-window counters allow potential burst spikes near window boundaries (e.g., 100 requests at 23:10:59 + 100 requests at 23:11:00). This tradeoff is accepted for its simplicity, speed, and atomic reliability in distributed deployments.

---

## 5. Fail-Closed Strategy for Redis Infrastructure Outages
If Redis becomes unavailable during a rate limit check on protected endpoints:
- The rate limiter catches the error silently, logs technical details, and **fails closed** by returning **HTTP 503 Service Unavailable** (`code: 'SERVICE_UNAVAILABLE'`).
- *Rationale*: Allowing unlimited traffic during Redis outages would expose the platform to severe abuse vulnerabilities when the Redis infrastructure is already degraded.

---

## 6. HTTP Response Headers & 429 Format
When quota is exceeded, the API responds with **HTTP 429 Too Many Requests**:

### Response Headers
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 42
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1700000060
```

### Response Body
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many notification requests for this project. Please try again later."
  }
}
```

---

## 7. Multi-Instance Cluster Scalability
Because rate limits are stored centrally in Redis rather than local in-memory Node.js Maps, request limits are enforced consistently across load-balanced API nodes (API Node A, Node B, Node C).

---

## 8. Rate Limits vs. Throughput vs. Provider Throttling

| Concept | Scope | Controlled By | Purpose |
| :--- | :--- | :--- | :--- |
| **API Request Rate Limit** | Ingress API Requests | Express Middleware + Redis | Protect API server, DB, & Queue from flooding |
| **Worker Throughput** | Background Job Processing | BullMQ `WORKER_CONCURRENCY` | Manage CPU & DB connection pools |
| **Provider Throttling** | External Network Dispatch | Transport Adapters (SMTP) | Comply with third-party network rate limits |

---

## 9. Future System Roadmap
- **Sliding-Window / Token Bucket Counter**: Smooth out window boundary burst spikes.
- **Plan-Based Tier Quotas**: Resolving project rate limits dynamically based on organization subscription tier (Free: 100/min, Pro: 1,000/min, Enterprise: Custom).
