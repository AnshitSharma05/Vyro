# RBAC, API-Key Scopes & Advanced Authorization Architecture

## 1. Executive Summary & Core Purpose
Security in a multi-tenant Notification Platform requires a strict separation between **Authentication** ("Who is this?") and **Authorization** ("What can this identity do?").

**Phase 17** introduces multi-layered defense-in-depth:
1. **Organization RBAC** (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`) for human JWT users.
2. **Permission-Based Authorization Matrix** in `permissions.js`.
3. **API Key Scopes** (`notifications:send`, `templates:read`, etc.) enforcing Least Privilege for machine API keys.
4. **Last Owner Invariant & Role Escalation Guards**.
5. **IDOR & Cross-Tenant Defense** returning **404 Not Found** for unauthorized cross-tenant resources.

---

## 2. Authentication vs. Authorization

```text
HUMAN REQUEST (JWT)
  Authentication ──► JWT Middleware ──► req.user
  Authorization  ──► requirePermission("PROJECTS_CREATE") ──► Role & Permission Matrix ──► Controller

MACHINE REQUEST (X-API-Key)
  Authentication ──► ApiKey Middleware ──► req.apiKey (scopes)
  Authorization  ──► requireScope("notifications:send") ──► Scope Validation ──► Controller
```

---

## 3. Organization Roles & Permission Matrix

| Permission | OWNER | ADMIN | MEMBER | VIEWER |
| :--- | :---: | :---: | :---: | :---: |
| `ORGANIZATION_READ` / `UPDATE` / `DELETE` | ✅ / ✅ / ✅ | ✅ / ✅ / ❌ | ✅ / ❌ / ❌ | ✅ / ❌ / ❌ |
| `MEMBERS_READ` / `MANAGE` | ✅ / ✅ | ✅ / ✅ | ✅ / ❌ | ✅ / ❌ |
| `PROJECTS_READ` / `CREATE` / `DELETE` | ✅ / ✅ / ✅ | ✅ / ✅ / ✅ | ✅ / ❌ / ❌ | ✅ / ❌ / ❌ |
| `API_KEYS_READ` / `CREATE` / `REVOKE` | ✅ / ✅ / ✅ | ✅ / ✅ / ✅ | ✅ / ❌ / ❌ | ✅ / ❌ / ❌ |
| `TEMPLATES_READ` / `CREATE` / `DELETE` | ✅ / ✅ / ✅ | ✅ / ✅ / ✅ | ✅ / ✅ / ❌ | ✅ / ❌ / ❌ |
| `NOTIFICATIONS_SEND` / `READ` / `CANCEL` | ✅ / ✅ / ✅ | ✅ / ✅ / ✅ | ✅ / ✅ / ✅ | ❌ / ✅ / ❌ |
| `ANALYTICS_READ` / `WEBHOOKS_READ` | ✅ / ✅ | ✅ / ✅ | ✅ / ✅ | ✅ / ✅ |

---

## 4. API Key Scopes (Machine Authorization)
Machine keys enforce Least Privilege with explicit scopes:
- `notifications:send` — Submit notifications (`POST /notifications/send`).
- `notifications:read` — Read notification status (`GET /notifications`).
- `notifications:cancel` — Cancel scheduled notifications (`POST /notifications/:id/cancel`).
- `templates:read` / `templates:write` — Manage templates.
- `analytics:read` — View analytics metrics.
- `webhooks:read` / `webhooks:write` — Manage webhooks.

> **Principle**: API keys can **never** create or administer API keys.

---

## 5. Owner Protection & Last Owner Invariant
- **Sole Owner Safeguard**: Demoting or removing the sole `OWNER` of an organization throws **HTTP 409 Conflict** (`LAST_OWNER_PROTECTION`).
- **Role Escalation Safeguard**: Non-owners cannot promote themselves or others to `OWNER`. Admins cannot demote or remove Owners.

---

## 6. HTTP Status Code Conventions
- `401 Unauthorized`: Unauthenticated request (invalid JWT or API Key).
- `403 Forbidden`: Authenticated request lacking required permission or scope.
- `404 Not Found`: Cross-tenant access attempt (prevents resource enumeration).
- `409 Conflict`: Violation of business rule invariant (e.g. Last Owner demotion).
