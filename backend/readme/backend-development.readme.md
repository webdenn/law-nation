# Law Nation Backend – Developer & Contributor Guide

## 1. Overview

The **Law Nation Backend** is a Node.js + TypeScript REST API built using **Express**, **Prisma**, and **PostgreSQL**. It provides:

* Secure authentication using **JWT (access + refresh tokens)**
* A **Role-Based Access Control (RBAC)** system with fine-grained permissions
* User, role, and permission management
* Centralized error handling and validation
* File/image upload support (local + Supabase)

The backend follows a **modular, layered architecture** designed for long-term maintainability and team contributions.

---

## 2. Tech Stack

* **Runtime**: Node.js
* **Language**: TypeScript (ESM)
* **Framework**: Express
* **ORM**: Prisma
* **Database**: PostgreSQL
* **Auth**: JWT (access + refresh tokens)
* **Validation**: Zod
* **Password Hashing**: bcrypt
* **File Uploads**: Multer (Local / Supabase)
* **Logging**: Morgan

---

## 3. Project Structure

```
src/
├── index.ts               # Server bootstrap
│
├── db/
│   └── db.ts              # Prisma + PostgreSQL adapter
│
├── modules/
│   ├── app/               # API router composition
│   ├── auth/              # Authentication module
│   ├── user/              # User management
│   └── rbac/              # Roles & permissions
│       ├── roles/
│       └── permissions/
│
├── middlewares/            # Auth, RBAC, uploads
├── utils/                  # JWT, errors, helpers
├── validators/             # Zod schemas
├── error-handlers/         # Centralized error handling
├── dto/                    # DTO mappers
└── types/                  # Global & request typings
```

---

## 4. Database & Prisma

### 4.1 Prisma Schema Overview

Core models:

* **User** – system users
* **Role** – logical role (Admin, Manager, etc.)
* **Permission** – atomic permission (`user.read`, `role.write`, etc.)
* **UserRole** – join table (many-to-many)
* **RolePermission** – join table (many-to-many)
* **RefreshToken** – hashed refresh tokens
* **AuditLog** – audit trail (future extensibility)

RBAC is fully normalized and scalable.

### 4.2 Running Migrations

```bash
npm run prisma:migrate
npm run prisma:generate
```

---

## 5. Authentication Flow

### 5.1 Login

1. User logs in with email + password
2. Password verified using bcrypt
3. Access token (JWT) issued
4. Refresh token generated, hashed, and stored in DB
5. Refresh token sent as **HTTP-only cookie**

### 5.2 Auth Middleware (`requireAuth`)

* Reads `Authorization: Bearer <token>`
* Verifies JWT
* Loads user, roles, and permissions
* Attaches to `req.user` and `req.permissions`

### 5.3 Token Refresh

* Refresh token is **single-use**
* On refresh:

  * Old token revoked
  * New access + refresh tokens issued

---

## 6. RBAC (Role-Based Access Control)

### 6.1 Permission Model

Permissions follow:

```
resource.action
```

Examples:

* `user.read`
* `role.write`
* `permission.delete`

Wildcard supported:

```
auditlog.*
```

### 6.2 `requirePermission` Middleware

```ts
requirePermission("User", "read")
```

Flow:

1. Fetch user roles
2. Aggregate all role permissions
3. Check exact or wildcard match
4. Deny with 403 if missing

> ⚠️ This middleware hits the DB per request. Consider caching role permissions for scale.

---

## 7. Module Pattern

Each module follows:

```
module/
├── *.routes.ts        # Express routes
├── *.controller.ts    # HTTP layer
├── *.service.ts       # Business logic
├── validators/        # Zod schemas
├── types/             # Local types
```

Controllers:

* Parse & validate input
* Call service layer
* Handle HTTP responses

Services:

* Prisma access
* Business rules
* No HTTP concerns

---

## 8. Error Handling

### 8.1 Custom Error Classes

All errors extend `HttpError`:

* `BadRequestError`
* `UnauthorizedError`
* `ForbiddenError`
* `NotFoundError`

### 8.2 Global Error Flow

```
Route → Controller → Service
            ↓
      throw HttpError
            ↓
     globalErrorHandler
```

Consistent JSON error responses.

---

## 9. File Uploads

### 9.1 Local vs Production

* `NODE_ENV=local` → stores in `/uploads`
* Otherwise → uploads to **Supabase Storage**

### 9.2 Middleware Usage

```ts
upload        // single image
uploadMulti() // multiple images
```

Uploaded file URLs are attached to:

* `req.fileUrl`
* `req.fileUrls`

---

## 10. Environment Variables

```env
DATABASE_URL=
JWT_SECRET=
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=30d

SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_BUCKET=

BCRYPT_SALT_ROUNDS=10
NODE_ENV=local
```

---

## 11. Contribution Guidelines

* Follow existing folder/module patterns
* Always add Zod validation
* Keep controllers thin
* No Prisma calls in routes
* Use typed errors (no raw `throw new Error()`)

---

## 12. Future Improvements

* Permission caching (Redis)
* Audit log middleware
* Soft deletes
* Rate limiting
* OpenAPI / Swagger docs

---

## 13. Getting Started (Backend)

```bash
docker compose up -d
npm install
npx prisma migrate dev
npm run start:dev
```

API available at:

```
http://localhost:4000/api
```

---

Happy hacking 🚀
