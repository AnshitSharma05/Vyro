# Multi-Channel Notifications & Provider Abstraction Architecture

## 1. Executive Summary & Core Purpose
A SaaS notification platform must support multiple delivery channels (**EMAIL**, **SMS**, **WHATSAPP**, **PUSH**) without coupling core business logic or worker dispatch algorithms to specific third-party provider APIs.

**Phase 15** establishes a clean **Provider Abstraction Layer** using the **Provider Factory Pattern**. Concrete delivery integrations (Nodemailer, Mock SMS, Mock WhatsApp, Firebase FCM) remain strictly encapsulated behind channel provider interfaces (`BaseNotificationProvider`).

---

## 2. Architecture & Layered Component Pipeline

```text
Notification Service / Notification Worker
                     │
                     ▼
           ProviderFactory (src/providers/provider.factory.js)
                     │
    ┌────────────────┼────────────────┬────────────────┐
    ▼                ▼                ▼                ▼
EMAIL Channel   SMS Channel    WHATSAPP Channel  PUSH Channel
Nodemailer      MockSmsProvider MockWhatsapp      FcmPushProvider
(Gmail/Mailtrap)(E.164 Mock)    (Cloud API Mock) (Firebase FCM)
```

---

## 3. Supported Channels & Development Providers

| Channel | Concrete Provider | Recipient Format | Development Transport |
| :--- | :--- | :--- | :--- |
| **`EMAIL`** | `NodemailerProvider` | Email address (`user@example.com`) | Gmail SMTP / Mailtrap |
| **`SMS`** | `MockSmsProvider` | Phone number (`+919999999999`) | Deterministic Mock Gateway |
| **`WHATSAPP`** | `MockWhatsappProvider` | Phone number (`+919999999999`) | Deterministic Cloud API Mock |
| **`PUSH`** | `FcmPushProvider` | FCM Device Token string | Firebase Admin SDK / Mock |

---

## 4. Provider Interface & Response Normalization
All concrete providers extend `BaseNotificationProvider` and return a normalized object:

```json
{
  "success": true,
  "provider": "mock-sms",
  "providerMessageId": "sms_msg_1724233000",
  "metadata": {
    "channel": "SMS",
    "sentAt": "2026-08-21T15:15:00.000Z"
  }
}
```

Every delivery attempt is stored in `NotificationAttempt` recording the concrete `provider` and `channel`.

---

## 5. Template & Channel Compatibility
Each template in the system is tied to a specific channel (e.g. `EMAIL` or `SMS`). If a client attempts to dispatch a template via an incompatible channel:
- `POST /api/v1/notifications/send` with `channel: "SMS"` and `template: "order-confirmed-email"`.
- Rejection: **HTTP 400 Bad Request** (`code: 'TEMPLATE_CHANNEL_MISMATCH'`).

---

## 6. Future Provider Failover Roadmap
The abstraction allows future multi-provider routing (e.g., Email Primary: SendGrid $\rightarrow$ Fallback: Amazon SES) without changing `NotificationService` or `notification.worker.js`.
