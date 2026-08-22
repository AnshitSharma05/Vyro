# Platform Technical Risk Register

| Risk ID | Risk Description | Impact | Likelihood | Current Mitigation | Remaining Risk / Future Action |
| :---: | :--- | :---: | :---: | :--- | :--- |
| **RSK-01** | Redis memory exhaustion under extreme queue backlog. | High | Low | BullMQ job retention limits (`removeOnComplete: 100`, `removeOnFail: 500`). | Monitor Redis memory and configure `maxmemory-policy volatile-lru`. |
| **RSK-02** | Third-party provider network ACK loss causing duplicate delivery. | Medium | Medium | Idempotency key deduplication at API boundary. | Document at-least-once semantics in SDK and webhook docs. |
| **RSK-03** | PostgreSQL connection pool exhaustion during burst traffic. | High | Low | Prisma `connection_limit` configured per container instance. | Implement read replicas for dashboard analytics queries. |
| **RSK-04** | Malicious burst traffic targeting API endpoints. | High | Medium | Redis sliding-window rate limiting per organization/IP. | Add Web Application Firewall (WAF) at CDN ingress. |
| **RSK-05** | API Key credential compromise via repository leakage. | High | Low | Raw keys shown once; database stores SHA-256 hashes only. | Instant key revocation API & audit trail logging. |
| **RSK-06** | Slow customer webhook consumer blocking worker threads. | Low | Medium | 5-second HTTP timeout per webhook dispatch request. | Dedicated webhook dispatch worker queue. |
