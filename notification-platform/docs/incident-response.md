# Incident Response Runbook & Lifecycle

## 1. Incident Management Lifecycle

```text
DETECTION ──► CONTAINMENT ──► DIAGNOSIS ──► RECOVERY ──► VERIFICATION ──► POST-MORTEM
```

---

## 2. Incident Phases

### Phase 1: Detection
- **Trigger**: Automated alert or failed readiness probe (`GET /health/ready` returns HTTP 503).
- **Initial Triage**: Identify impacted component (Express API, BullMQ Workers, PostgreSQL, Redis).

### Phase 2: Containment
- **Goal**: Prevent cascading failure and isolate impact.
- **Actions**:
  1. Enable aggressive rate limiting if burst traffic threatens database stability.
  2. Degrade non-essential features (e.g. pause non-critical marketing notifications).

### Phase 3: Diagnosis
- **Logs Inspection**: Query Pino structured JSON logs filtered by `X-Request-ID` or `notificationId`.
- **Infrastructure Check**: Inspect container memory, CPU utilization, and database connection pool statistics.

### Phase 4: Recovery
- Execute specific disaster recovery procedure from `docs/disaster-recovery.md` (e.g. restart container, execute provider failover, restore database backup).

### Phase 5: Verification
- Run post-deployment smoke test script:
  ```bash
  npm --prefix server run smoke-test
  ```
- Confirm `/health/live` and `/health/ready` return 200 OK.

### Phase 6: Post-Mortem & Review
- Document root cause analysis (RCA), timeline of events, action items, and technical debt updates in `docs/technical-debt.md`.
