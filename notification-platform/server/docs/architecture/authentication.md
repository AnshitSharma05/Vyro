# Human User Authentication Architecture

## 1. Overview
The Notification Platform uses **JWT-based stateless authentication** for System 1 (human dashboard users and organization members). 

Developers and dashboard administrators authenticate via Email + Password, receive a Signed JSON Web Token (JWT), and include this token in subsequent API requests via the standard HTTP `Authorization: Bearer <token>` header.

---

## 2. Dual Authentication System Design

Our platform operates two distinct authentication mechanisms tailored for different security profiles:

| Feature | System 1: Human User Auth (Phase 2) | System 2: Application API Key Auth (Phase 3) |
| :--- | :--- | :--- |
| **Users** | Dashboard developers & Org admins | Client applications sending notifications |
| **Mechanism** | Email + Password $\rightarrow$ Signed JWT | Raw API Key (`np_live_...`) $\rightarrow$ SHA-256 Hash Lookup |
| **State** | Stateless (JWT verified via secret key) | State-checked (Revocation & project active status in DB) |
| **Lifetime** | Configurable expiry (e.g. 7 days) | Long-lived / Revokable |

### Why Keep API Keys Separate?
JWTs cannot be instantly revoked without a centralized blacklist (which breaks statelessness). Machine-to-machine application keys (System 2) require instant revocation capabilities if a client leaks a secret key in public code repositories.

---

## 3. Password Hashing Strategy
- **Library**: `bcrypt`
- **Salt Rounds**: Configurable via `BCRYPT_SALT_ROUNDS` (Default: 10 in dev, 12+ in production).
- **Security Protections**:
  - Plaintext passwords are NEVER saved to the database.
  - Plaintext passwords and hashes are NEVER logged to console/Pino output.
  - `passwordHash` is excluded from all Prisma `select` queries on user responses.

---

## 4. JWT Design & Structure
Tokens are signed using `HS256` with a secret key loaded from `JWT_SECRET`.

### Claims Payload
```json
{
  "sub": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "iat": 1700000000,
  "exp": 1700604800
}
```
- **`sub`**: Subject (User ID UUID).
- **`email`**: User email address for quick identification.
- **Excluded**: No passwords, hashes, organization secrets, or roles are stored inside the JWT token.

---

## 5. Endpoints & Flow Diagrams

### A. User Registration (`POST /api/v1/auth/register`)
```
Client  ──►  Zod Validation  ──►  Email Normalization (trim & lowercase)
                                           │
                                           ▼
                                 Check Existing User (DB)
                                 ├── Found?  ──► 409 Conflict Error
                                 └── Not Found?
                                           │
                                           ▼
                                 Hash Password (bcrypt)
                                           │
                                           ▼
                                 Create User in PostgreSQL
                                           │
                                           ▼
                                 Sign JWT Token
                                           │
                                           ▼
                                 Return 201 Created (User + Token)
```

### B. User Login (`POST /api/v1/auth/login`)
```
Client  ──►  Zod Validation  ──►  Normalize Email
                                           │
                                           ▼
                                 Find User by Email
                                 ├── Not Found? ──► 401 Unauthorized ("Invalid email or password")
                                 └── Found?
                                           │
                                           ▼
                                 Compare Password (bcrypt)
                                 ├── Mismatch?  ──► 401 Unauthorized ("Invalid email or password")
                                 └── Match?
                                           │
                                           ▼
                                 Sign JWT Token
                                           │
                                           ▼
                                 Return 200 OK (User + Token)
```

> [!SECURITY]
> **Anti-Enumeration Protection**: Login failures use the generic message `"Invalid email address or password"` to prevent attackers from harvesting valid email accounts.

### C. Current User Profile (`GET /api/v1/auth/me`)
```
Client (Header: `Authorization: Bearer <token>`)
  │
  ▼
`auth.middleware.js`
  ├── Token Missing/Malformed? ──► 401 Unauthorized
  └── Verify Signature & Expiry (JWT_SECRET)
            │
            ▼
  Fetch User by `sub` (DB)
  ├── User deleted/missing? ──► 401 Unauthorized
  └── Found?
            │
            ▼
  Attach `req.user` & Call `next()`
            │
            ▼
`auth.controller.js` ──► Return 200 OK (User Object)
```

---

## 6. Stateless Logout Strategy

Because JWT tokens are verified using a cryptographic signature without a server-side session table:
- **Logout is a client-side operation**: The client dashboard deletes the JWT from local storage or memory.
- **`POST /api/v1/auth/logout`**: Provided for API consistency. Returns `200 OK`.
- **Server-Side Token Blacklisting**: Not implemented in Phase 2 to preserve high performance and statelessness. Redis token blacklisting can be introduced in a future reliability phase if explicit session revocation becomes a compliance requirement.

---

## 7. Email Normalization
Email addresses are normalized by converting to lowercase and stripping leading/trailing whitespace (`email.trim().toLowerCase()`).
This prevents duplicate user accounts such as `User@Example.com` vs `user@example.com`.

---

## 8. Error Handling & API Response Format

All responses follow a consistent schema:

### Success Response (`200 OK` / `201 Created`)
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "name": "John Doe",
      "createdAt": "2026-08-20T12:00:00.000Z",
      "updatedAt": "2026-08-20T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Error Response (`400` / `401` / `409` / `500`)
```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid email address or password"
  }
}
```

---

## 9. Security Audit Checklist
- [x] Passwords hashed using bcrypt (10 rounds).
- [x] No plaintext passwords stored.
- [x] No `passwordHash` exposed in any API response or log.
- [x] Generic error message on failed login.
- [x] JWT secrets loaded strictly from environment variables.
- [x] Token signature & expiration validated on protected routes.
- [x] Inputs sanitized and validated using Zod.
- [x] Email normalization enforced across all auth flows.
