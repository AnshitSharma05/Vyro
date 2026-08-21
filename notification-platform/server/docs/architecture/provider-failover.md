# Provider Failover & Intelligent Provider Routing Architecture

## 1. Executive Summary & Core Purpose
High-availability notification platforms cannot rely on a single third-party delivery provider. Provider outages, network timeouts, or rate limits must be mitigated transparently before failing customer notifications.

**Phase 16** introduces automated **Provider Failover** orchestrated by `ProviderRouter` (`server/src/providers/provider.router.js`) and `ProviderFailoverPolicy` (`server/src/providers/provider.failover-policy.js`).

---

## 2. Architecture & Failover Sequence

```text
NOTIFICATION WORKER (src/workers/notification.worker.js)
                     │
                     ▼
           ProviderRouter (src/providers/provider.router.js)
                     │
         1. Execute PRIMARY Provider (e.g. Nodemailer)
                     │
         ├── SUCCESS ──► Return Primary Result (Attempt 1: PRIMARY)
         │
         └── FAILURE ──► Evaluate Error with ProviderFailoverPolicy
                            │
                            ├── NON-RETRYABLE ──► Fail Fast (Skip Fallback)
                            │
                            └── FAILOVER-ELIGIBLE ──► Execute FALLBACK Provider (e.g. Mock Fallback)
                                                        │
                                                        ├── SUCCESS ──► Return Fallback Result (Attempt 2: FAILOVER)
                                                        └── FAILURE ──► Return Final Failure
```

---

## 3. Primary vs. Fallback Provider Mapping

| Channel | Primary Provider | Fallback Provider | Failover Trigger |
| :--- | :--- | :--- | :--- |
| **`EMAIL`** | `NodemailerProvider` (`email-primary`) | `MockEmailFallbackProvider` (`mock-email-fallback`) | Timeout / SMTP Downtime / 5xx |
| **`SMS`** | `MockSmsProvider` (`mock-sms-primary`) | `MockSmsFallbackProvider` (`mock-sms-fallback`) | Gateway Timeout / 5xx |
| **`WHATSAPP`** | `MockWhatsappProvider` (`mock-wa-primary`) | `MockWhatsappFallbackProvider` (`mock-wa-fallback`) | Cloud API Downtime / 5xx |
| **`PUSH`** | `FcmPushProvider` (`fcm-primary`) | `MockPushFallbackProvider` (`mock-push-fallback`) | FCM Service Outage / 5xx |

---

## 4. Failover Eligibility Policy
Non-retryable client payload or recipient errors (e.g., `INVALID_RECIPIENT`, `INVALID_EMAIL`, `INVALID_PHONE`, `INVALID_DEVICE_TOKEN`, `400 Bad Request`) do **not** trigger failover.

Only provider availability issues (`PROVIDER_UNAVAILABLE`, `TIMEOUT`, `NETWORK_ERROR`, `PROVIDER_RATE_LIMITED`, `5xx`) trigger fallback execution.

---

## 5. Granular Telemetry & Attempt Tracking
Each provider attempt creates a distinct record in `NotificationAttempt` storing `provider`, `status`, `attemptNumber`, and `attemptReason` (`'PRIMARY'` vs `'FAILOVER'`).

The `Notification` record preserves a single `notificationId` throughout all primary and fallback attempts.

---

## 6. Customer Webhook & Analytics Isolation
- **Customer Webhooks**: Only receive final notification lifecycle events (`notification.sent` or `notification.failed`). Intermediate provider failovers remain internal platform telemetry.
- **Analytics & Metering**: A successful fallback marks the notification as `SENT` and increments `sentCount` by 1. Provider failover does not duplicate notification counts.
