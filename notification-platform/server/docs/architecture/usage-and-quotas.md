# Usage Metering, Quotas & Billing-Ready Architecture

## 1. Executive Summary & Core Purpose
A production SaaS notification platform must enforce subscription plan limits (`FREE`, `PRO`, `BUSINESS`) to prevent system abuse, provide clear tenant consumption visibility, and prepare the platform for future billing integration.

**Phase 21** introduces:
1. **Subscription Plans & Limits**: `Plan` model (`FREE`, `PRO`, `BUSINESS`) and `PlanLimit` mapping metrics (`NOTIFICATIONS`, `EVENTS`, `API_REQUESTS`, `PROJECTS`, `API_KEYS`, `TEMPLATES`, `WORKFLOWS`) to quantitative limits.
2. **Organization Tenant Plan Assignment**: `Organization.planId` assigning plans to tenants (default `FREE`).
3. **Time-Aware Usage Periods**: Monthly UTC billing periods (`OrganizationUsage`) preserving historical usage across months.
4. **Quota Service & Atomic Increments**: `QuotaService` checks metered and resource count quotas using atomic database operations before resource creation (`QUOTA_EXCEEDED` HTTP 429 error).
5. **Over-Quota Behavior & Non-Destructive Downgrades**: Downgrading a plan preserves all existing customer data and resources, placing the tenant in an over-quota state that blocks *new* resource creation until usage falls below limits.
6. **No External Payment Dependency**: Stops cleanly at quota metering and plan assignments without integrating third-party payment gateways (No Stripe/Razorpay/Paddle).

---

## 2. Quota Check & Metering Sequence

```text
HTTP REQUEST (e.g. POST /api/v1/notifications/send)
       │
       ▼
NOTIFICATION SERVICE (src/modules/notifications/notification.service.js)
       │
       ├── 1. Resolve Organization ID
       ├── 2. QUOTA SERVICE: checkMeteredQuota(orgId, 'NOTIFICATIONS', 1)
       │       │
       │       ├── Fetch Organization Plan & Limits (FREE: 1000)
       │       ├── Read Current Monthly Usage (Used: 450)
       │       │
       │       ├── EXCEEDED? ──► Throw AppError(429, 'QUOTA_EXCEEDED')
       │       └── ALLOWED?  ──► Proceed
       │
       ├── 3. Create Notification Record
       │
       └── 4. USAGE SERVICE: recordUsage(orgId, 'NOTIFICATIONS', 1)
               └── Atomic Upsert (quantity: { increment: 1 })
```

---

## 3. Plans & Default Limits Matrix

| Metric | Metric Type | `FREE` | `PRO` | `BUSINESS` |
| :--- | :--- | :---: | :---: | :---: |
| **`NOTIFICATIONS`** | Metered Monthly | 1,000 | 25,000 | 100,000 |
| **`EVENTS`** | Metered Monthly | 5,000 | 100,000 | 500,000 |
| **`API_REQUESTS`** | Metered Monthly | 10,000 | 250,000 | 1,000,000 |
| **`PROJECTS`** | Resource Count | 2 | 10 | 50 |
| **`API_KEYS`** | Resource Count | 5 | 25 | 100 |
| **`TEMPLATES`** | Resource Count | 20 | 100 | 500 |
| **`WORKFLOWS`** | Resource Count | 5 | 25 | 100 |

---

## 4. Usage Accounting Principles
- **Logical Notification Accounting**: 1 logical notification creation = 1 `NOTIFICATIONS` usage. Provider retries, failovers, multi-device push dispatches, and scheduled jobs do **NOT** double-count.
- **Business Event Accounting**: 1 accepted event = 1 `EVENTS` usage. Replayed idempotent events do **NOT** double-count.
- **Resource Count Accounting**: Evaluated dynamically against database counts (`PROJECTS`, `API_KEYS`, `TEMPLATES`, `WORKFLOWS`).

---

## 5. API Endpoints & Scopes
- `GET /api/v1/plans` — List available subscription plans.
- `POST /api/v1/plans/organizations/:organizationId/plan` — Change organization plan (Authorized JWT).
- `GET /api/v1/usage/summary` — View organization monthly usage summary (`usage:read` scope or Authorized JWT).
- `GET /api/v1/usage/history` — View historical usage (Authorized JWT).
