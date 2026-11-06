# AI-Powered HMO Reconciliation Engine — Backend

Node.js + Express + MongoDB backend API for reconciling HMO invoices against payroll deductions, enrolment records, and payment data.

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v22 |
| Framework | Express.js |
| Database | MongoDB Atlas via Mongoose |
| Job Queue | BullMQ + Redis |
| Auth | JWT (access + refresh tokens) |
| File Parsing | ExcelJS (XLSX), csv-parser (CSV) |
| Validation | Joi |

---

## Project Structure

```
├── server.js                     # Entry point — starts HTTP server
├── src/
│   ├── app.js                    # Express app — middleware and route registration
│   ├── modules/
│   │   ├── auth/                 # Register, login, refresh, logout, me
│   │   ├── documents/            # Import batch upload and status
│   │   ├── reconciliation/       # Reconciliation runs
│   │   ├── exceptions/           # Exception listing and resolution
│   │   ├── dashboard/            # Summary aggregates + health check
│   │   ├── providers/            # HMO provider and plan rate management
│   │   └── members/              # Employee ID ↔ HMO member ID mappings
│   └── shared/
│       ├── config/
│       │   ├── index.js          # All env vars validated here
│       │   ├── database.js       # MongoDB connection
│       │   └── redis.js          # Redis connection (BullMQ)
│       ├── middleware/
│       │   ├── authenticate.js   # JWT verification + role authorization
│       │   ├── requestId.js      # Unique request ID on every request
│       │   └── errorHandler.js   # Global error handler
│       ├── queue/
│       │   ├── constants.js      # Queue and job name constants
│       │   └── queues.js         # BullMQ queue instances
│       └── utils/
│           └── AppError.js       # Operational error class
```

---

## Getting Started

### Prerequisites
- Node.js v18+
- MongoDB Atlas cluster
- Redis instance (local or cloud)

### Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd ai-powered-hmo-product

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secrets, and Redis config

# 4. Start in development mode (hot reload)
npm run dev

# 5. Verify
curl http://localhost:5000/api/v1/health
```

---

## API Base

All endpoints are prefixed with `/api/v1`.

| Endpoint | Access | Description |
|---|---|---|
| `GET /api/v1/health` | Public | App and dependency health |
| `POST /api/v1/auth/register` | Public | Create account |
| `POST /api/v1/auth/login` | Public | Authenticate |
| `POST /api/v1/auth/refresh` | Refresh token | Renew access token |
| `POST /api/v1/auth/logout` | Authenticated | Revoke session |
| `GET /api/v1/auth/me` | Authenticated | Current user profile |
| `POST /api/v1/users` | Admin | Invite new user |
| `GET /api/v1/users` | Admin | List users |
| `POST /api/v1/imports` | Authorized | Upload CSV/XLSX import |
| `GET /api/v1/imports` | Authorized | List import batches |
| `GET /api/v1/imports/:id` | Authorized | Import batch status |
| `POST /api/v1/reconciliation-runs` | Finance Officer | Start reconciliation |
| `GET /api/v1/reconciliation-runs/:id` | Authorized | Run results |
| `GET /api/v1/exceptions` | Authorized | List exceptions |
| `GET /api/v1/exceptions/:id` | Authorized | Exception detail |
| `PATCH /api/v1/exceptions/:id` | Finance Officer | Resolve exception |
| `GET /api/v1/dashboard/summary` | Authorized | Financial aggregates |

---

## Standard Response Envelope

**Success**
```json
{
  "success": true,
  "data": { }
}
```

**Error**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": [{ "field": "documentType", "message": "Unsupported document type." }],
    "requestId": "req_123"
  }
}
```

---

## Environment Variables

All required variables are listed in [.env.example](.env.example). Remember to set the Upstash Redis credentials (`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`) for the job queue. Never commit `.env` to version control.

---

## Security Notes

- Passwords hashed with bcrypt (never stored in plaintext)
- JWT access tokens expire in 15 minutes
- All protected resources are scoped to the authenticated user's organization
- Rate limiting applied globally and stricter limits on auth endpoints
- File content validated beyond extension and MIME type
- Stack traces never exposed in API responses
