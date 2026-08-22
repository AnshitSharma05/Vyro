# Technical Debt & Known Scope Boundaries

This document records intentional architectural tradeoffs, current scope boundaries, and planned future enhancements.

---

## 1. Intentional Scope Boundaries (Not Bugs)

The following items represent deliberate scope boundaries to maintain local reproducibility without external paid SaaS dependencies:

- **Mock Providers**: SMS (Twilio mock), WhatsApp (Meta mock), and Push (FCM mock) use validated mock drivers locally. Production integration requires populating live provider API credentials.
- **Billing Engine**: The platform implements metered quota enforcement (`QuotaService`) and usage accounting (`OrganizationUsage`), but leaves Stripe/Paddle payment collection as an external integration point.
- **Single-Region Deployment**: Docker Compose and CI configurations deploy to a single primary cloud region.
- **No Kubernetes / Service Mesh**: Container orchestration is managed via standard Docker Compose and cloud container runners (e.g. AWS ECS / Render).

---

## 2. Future Architectural Improvements

1. **Database Read Replicas**: Route read-heavy dashboard analytics and history queries to PostgreSQL read replicas.
2. **Pre-aggregated Analytics Tables**: Maintain daily aggregated rollup tables (`DailyNotificationMetrics`) to optimize multi-month analytics queries.
3. **Redis Cluster Support**: Upgrade Redis queue connection management to support multi-node Redis Cluster topologies for ultra-high throughput environments.
4. **OpenTelemetry Tracing**: Add distributed tracing headers (`traceparent`) across API requests, BullMQ jobs, and webhook dispatches.
