# REST API Reference & Semantics

## 1. Overview & Authentication
The Notification Platform REST API uses standard HTTP response codes and JSON error structures. All endpoints are prefixed with `/api/v1`.

### Machine Authentication (API Keys)
Include the API Key in request headers:
```http
X-API-Key: np_live_xyz123...
```

### Dashboard User Authentication (JWT)
Include the Bearer token in HTTP Authorization headers:
```http
Authorization: Bearer eyJhbGciOiJIUzI1Ni...
```

---

## 2. Standard HTTP Response Codes

| Status Code | Meaning | Description |
| :--- | :--- | :--- |
| **`200 OK`** | Success | Request succeeded and returned requested data. |
| **`201 Created`** | Created | Resource (template, project, API key) created successfully. |
| **`202 Accepted`** | Accepted | Notification or event accepted and enqueued for asynchronous processing. |
| **`400 Bad Request`** | Invalid Input | Malformed JSON or invalid schema format. |
| **`401 Unauthorized`** | Authentication Failure | Missing or invalid API Key / JWT token. |
| **`403 Forbidden`** | Insufficient Scopes | Authenticated token lacks required permission scope. |
| **`404 Not Found`** | Resource Missing | Target entity (notification, project) does not exist. |
| **`409 Conflict`** | Resource Conflict | Duplicate entity identifier or constraint violation. |
| **`422 Unprocessable`** | Validation Error | Request body failed Zod schema validation rules. |
| **`429 Rate Limited / Quota Exceeded`** | Throttled | Organization exceeded rate limit or monthly usage quota. |
| **`500 Server Error`** | Internal Failure | Sanitized error response with attached `requestId`. |

---

## 3. Core API Endpoints

### 3.1 Send Notification
`POST /api/v1/notifications/send`
- **Headers**: `X-API-Key` (Scope: `notifications:write`), `Idempotency-Key` (Optional)
- **Request Body**:
```json
{
  "channel": "EMAIL",
  "category": "TRANSACTIONAL",
  "template": "welcome-email",
  "recipient": {
    "externalUserId": "usr_1001",
    "email": "user@example.com"
  },
  "data": {
    "name": "Alex"
  }
}
```
- **Response (`202 Accepted`)**:
```json
{
  "success": true,
  "data": {
    "id": "notif_clx123xyz",
    "status": "PENDING",
    "channel": "EMAIL",
    "recipient": "user@example.com",
    "createdAt": "2026-08-22T20:00:00.000Z"
  }
}
```

### 3.2 Track Business Event
`POST /api/v1/events`
- **Headers**: `X-API-Key` (Scope: `events:write`)
- **Request Body**:
```json
{
  "event": "ORDER_CREATED",
  "externalEventId": "evt_order_99812",
  "recipient": {
    "externalUserId": "usr_1001"
  },
  "data": {
    "orderId": "ORD-99812",
    "amount": 49.99
  }
}
```
- **Response (`202 Accepted`)**:
```json
{
  "success": true,
  "data": {
    "id": "evt_clx99812",
    "event": "ORDER_CREATED",
    "status": "PROCESSED",
    "triggeredCount": 1
  }
}
```

---

## 4. Standard Error Format
All errors return a consistent JSON structure:
```json
{
  "success": false,
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Monthly notification quota exceeded for this organization.",
    "requestId": "req_clx778899"
  }
}
```
