# Notification Preferences, User Devices & Delivery Rules Architecture

## 1. Executive Summary & Core Purpose
In Notification-as-a-Service (NaaS), external customer applications decide **"What event happened?"** (e.g. `ORDER_CREATED`, `MARKETING_PROMOTION`), while the platform decides **"How should this notification be delivered?"** based on recipient preferences and device availability.

**Phase 18** introduces:
1. **Recipient Domain**: `Recipient` model representing customer end-users identified by `(projectId, externalUserId)`.
2. **Notification Categories**: `TRANSACTIONAL`, `SECURITY`, `MARKETING`, `SYSTEM`.
3. **Recipient Preference Model**: Relational mapping of `(recipientId, category, channel)` to `enabled: boolean`.
4. **Push Device Tracking**: `Device` model storing push tokens per recipient (`IOS`, `ANDROID`, `WEB`).
5. **Delivery Policy Engine**: Evaluates delivery eligibility at creation time. Suppressed notifications receive `SUPPRESSED` status with explicit reasons (`USER_PREFERENCE`, `NO_ACTIVE_DEVICE`, `NO_VALID_RECIPIENT`, `SYSTEM_POLICY`) and skip BullMQ queue execution.

---

## 2. Delivery Evaluation Sequence

```text
POST /api/v1/notifications/send
       │
       ▼
NOTIFICATION SERVICE (src/modules/notifications/notification.service.js)
       │
       ├── 1. Resolve Recipient (externalUserId or direct recipient string)
       ├── 2. Validate Category (TRANSACTIONAL, SECURITY, MARKETING, SYSTEM)
       │
       ▼
DELIVERY POLICY ENGINE (src/shared/notification/delivery-policy.service.js)
       │
       ├── Check System Policy (e.g. SECURITY category cannot be opted out of)
       ├── Check Recipient Preference for Category + Channel
       ├── Check Active Device availability for PUSH channel
       │
       ├── ALLOWED ──────► Create Notification (PENDING/SCHEDULED) ──► Queue BullMQ Job
       │
       └── SUPPRESSED ───► Create Notification (SUPPRESSED) ──► Emit notification.suppressed (No Queue)
```

---

## 3. Notification Categories & Default Preferences

| Category | Email | SMS | WhatsApp | Push | Policy Override |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`TRANSACTIONAL`** | ✅ On | ✅ On | ✅ On | ✅ On | User Opt-Out Allowed |
| **`SECURITY`** | ✅ On | ✅ On | ✅ On | ✅ On | **Critical - Cannot Opt-Out** |
| **`SYSTEM`** | ✅ On | ❌ Off | ❌ Off | ✅ On | User Opt-Out Allowed |
| **`MARKETING`** | ❌ Off | ❌ Off | ❌ Off | ❌ Off | Strict Opt-In Default |

---

## 4. Push Notification Device Handling
- Recipients may have multiple active push devices (`Device` model).
- Push notifications are dispatched to all active registered devices.
- If a recipient has **no active devices** registered, PUSH channel notifications are marked `SUPPRESSED` with reason `NO_ACTIVE_DEVICE`.
- When a provider reports an invalid device token (e.g. FCM invalid registration), the device is deactivated (`isActive = false`).

---

## 5. Suppression Reasons
- `USER_PREFERENCE`: Recipient explicitly opted out of target category + channel.
- `NO_ACTIVE_DEVICE`: Push notification requested but recipient has no active registered push tokens.
- `NO_VALID_RECIPIENT`: Requested channel lacks necessary contact detail (e.g. missing email/phone).
- `SYSTEM_POLICY`: Category system policy prevents delivery over specified channel.

---

## 6. API Key Scopes
- `recipients:read` / `recipients:write`: Manage recipient profiles.
- `preferences:read` / `preferences:write`: Manage recipient preferences.
- `devices:read` / `devices:write`: Manage push devices.
