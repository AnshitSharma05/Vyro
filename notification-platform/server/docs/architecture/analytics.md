# Analytics, Usage Tracking & Observability Architecture

## 1. Executive Summary & Core Concepts
Real-time operational reporting and usage metering enable SaaS customers to track notification delivery performance, volume trends, channel distribution, and error rates.

**Phase 13** establishes a scalable **Analytics & Usage Architecture**:
1. **Source of Truth Reporting**: Analytics endpoints query indexed PostgreSQL tables (`Notification`, `NotificationAttempt`, `Event`) to derive status groups, delivery rates, failure rates, latencies, and timeline charts.
2. **Atomic Daily Usage Metering**: Metering updates accumulate in daily `UsageRecord` rows (`(projectId, date, channel)`). Upserts use PostgreSQL atomic increments (`increment: 1`) to eliminate concurrency race conditions.
3. **Decoupled Failure Isolation**: Analytics updates are non-blocking and execute asynchronously. An analytics recording failure never alters the notification lifecycle state or fails customer send requests.

---

## 2. Metric Semantics & Formula Definitions

| Metric | Formula / Calculation | Description |
| :--- | :--- | :--- |
| **Total Notifications** | `COUNT(DISTINCT notificationId)` | Total distinct notifications ingested. |
| **Sent** | Status in `[SENT, DELIVERED]` | Notifications successfully handed to provider. |
| **Delivered** | Status == `DELIVERED` | Notifications confirmed delivered by provider. |
| **Failed** | Status == `FAILED` | Notifications ending in permanent delivery failure. |
| **Bounced** | Status == `BOUNCED` | Notifications rejected by recipient mail server. |
| **Delivery Rate (%)** | `(Delivered / Sent) * 100` | Percentage of accepted messages delivered. |
| **Failure Rate (%)** | `(Failed / TotalNotifications) * 100` | Percentage of ingested messages that failed. |
| **Avg Delivery Latency** | `AVG(sentAt - createdAt)` | Average time in ms from API creation to provider acceptance. |

---

## 3. Daily Aggregation & Usage Metering Model

To prevent expensive `SELECT COUNT(*)` table scans across millions of rows, high-volume metrics utilize daily aggregated counters in PostgreSQL:

```prisma
model UsageRecord {
  id             String   @id @default(uuid())
  projectId      String
  date           DateTime // UTC midnight normalized date
  channel        Channel  // EMAIL, SMS, WHATSAPP, PUSH
  totalCount     Int      @default(0)
  sentCount      Int      @default(0)
  deliveredCount Int      @default(0)
  failedCount    Int      @default(0)
  bouncedCount   Int      @default(0)

  @@unique([projectId, date, channel])
  @@index([projectId, date])
}
```

### Atomic Upsert Algorithm
```js
await prisma.usageRecord.upsert({
  where: { projectId_date_channel: { projectId, date: utcDate, channel } },
  update: { [field]: { increment: 1 } },
  create: { projectId, date: utcDate, channel, [field]: 1 },
});
```

---

## 4. Timezone Strategy & Timeline Zero-Padding
- **UTC Standardization**: Dates are stored and evaluated in UTC.
- **Continuous Time-Series**: When querying a range (e.g. `7d`), the service constructs a full calendar timeline and pads missing dates with zero counts (`total: 0, sent: 0, delivered: 0, failed: 0`) so frontend charting components render continuous trends without gaps.
- **Maximum Query Bound**: Custom date ranges are bounded to a maximum of 365 days to guarantee query execution latency limits.
