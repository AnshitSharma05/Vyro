# SaaS Multi-Tenancy Architecture & Tenant Isolation

## 1. Overview
The Notification Platform (Notification-as-a-Service) is built on a **multi-tenant architecture**. Multiple independent organizations (customers) share the platform infrastructure while maintaining total data isolation.

---

## 2. Tenant Hierarchy
The **Organization** is the primary tenant boundary in our system.

```
User (Dashboard Human User)
  │
  ├── OrganizationMember (Junction with Role: OWNER | ADMIN | MEMBER)
  │         │
  │         ▼
  └── Organization (Primary Tenant Boundary)
            │
            └── Project (Scoped Application Container)
                  ├── ApiKey (M2M Credentials)
                  ├── Template (Notification Templates)
                  ├── Notification (Dispatch Records)
                  └── Webhook (Callback Endpoints)
```

- **User**: Represents a human identity. A user can belong to multiple organizations with different roles in each.
- **Organization**: Primary tenant container. Data belonging to Organization A must NEVER be accessible to Organization B.
- **Project**: Represents a specific environment/application (e.g., `production`, `mobile-app`) belonging to exactly one organization.

---

## 3. Authentication vs. Authorization

| Concept | Purpose | Handled By |
| :--- | :--- | :--- |
| **Authentication** | Answers *"Who are you?"* | `auth.middleware.js` (Validates JWT Bearer Token $\rightarrow$ attaches `req.user`) |
| **Authorization** | Answers *"Which tenant and resource can you access?"* | `OrganizationService` & `ProjectService` (Verifies membership & role permissions) |

> [!IMPORTANT]
> The JWT token establishes **user identity only**. It does NOT authorize access to an organization or project automatically. Every endpoint must check organization membership server-side.

---

## 4. Tenant Isolation & IDOR Prevention

Insecure Direct Object References (IDOR) occur when an API allows a user to access a resource by simply changing an ID in the URL.

### Anti-IDOR Enforcement Pipeline

#### A. Organization Access Pipeline
```
Request: GET /api/v1/organizations/:organizationId
  │
  ▼
1. Authenticate User (JWT)
  │
  ▼
2. Check OrganizationMember Table (`where: { organizationId, userId }`)
  ├── Membership Missing? ──► 403 Forbidden ("You are not a member of this organization")
  └── Member Found?
            │
            ▼
3. Return Organization Data + User Role
```

#### B. Project Access Pipeline (Double-Check Strategy)
```
Request: GET /api/v1/organizations/:organizationId/projects/:projectId
  │
  ▼
1. Authenticate User (JWT)
  │
  ▼
2. Verify User Membership in `organizationId`
  ├── Not a member? ──► 403 Forbidden
  └── Member Found?
            │
            ▼
3. Query Project with Compound Check: `findProjectByIdAndOrganizationId(projectId, organizationId)`
  ├── `project.organizationId !== organizationId` OR Project Missing? ──► 404 Not Found
  └── Valid & Belongs to Org?
            │
            ▼
4. Return Project Data
```

---

## 5. Role & Permission Model

For Phase 3, a lightweight 3-tier Role model is enforced:

| Role | Organization Permissions | Project Permissions |
| :--- | :--- | :--- |
| **`OWNER`** | Create, Read, Update Organization | Create, Read, Update Projects |
| **`ADMIN`** | Read, Update Organization | Create, Read, Update Projects |
| **`MEMBER`** | Read Organization | Read Projects Only |

---

## 6. Atomic Organization Creation Transaction

Creating an organization requires creating TWO records:
1. `Organization`
2. `OrganizationMember` with role `OWNER`

This is wrapped in a **Prisma Transaction** (`prisma.$transaction`) to guarantee atomicity:

```javascript
return prisma.$transaction(async (tx) => {
  const organization = await tx.organization.create({
    data: { name, slug },
  });

  const member = await tx.organizationMember.create({
    data: {
      organizationId: organization.id,
      userId,
      role: 'OWNER',
    },
  });

  return { ...organization, membership: member };
});
```

If owner membership creation fails, the entire organization creation is automatically rolled back.

---

## 7. Tenant-Scoped Unique Slugs

- **Organization Slugs**: Generated from name (e.g. `acme-corp`). If a collision occurs globally, a numeric counter suffix (e.g. `acme-corp-2`) is automatically appended.
- **Project Slugs**: Tenant-scoped (`@@unique([organizationId, slug])`). Two different organizations can use the same project slug (e.g. `ecommerce`), but within the same organization, project slugs must be unique.
