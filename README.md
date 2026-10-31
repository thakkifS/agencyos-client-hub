# Agency OS — Client Hub

Foundation for the Neirah Tech interview assignment: a client operating, communication and requirement management hub.

## Stack

- `frontend/`: Next.js App Router, TypeScript, Tailwind CSS and Inter
- `backend/`: NestJS REST API, DTO validation, Jest and Prisma ORM
- PostgreSQL, configured through `DATABASE_URL`

## Prerequisites

Node.js 24.11+ (the Prisma 7 supported Node 24 line), npm, and PostgreSQL. The checked local machine reports Node 25.2.1/npm 11.6.2. The reachable local server is PostgreSQL 14.20, configured for port 5432 and Unix socket `/tmp`, with current local role `thakkifilyas` and maintenance database `postgres`. The intended `agency_os_db` database is absent on this instance. A TCP readiness check did not respond, and the separate PostgreSQL 18 pgAdmin connection has not been identified.

## Install and run

```sh
cd frontend && npm install && npm run dev
# In another terminal:
cd backend && npm install && cp .env.example .env && npm run start:dev
```

Frontend: http://localhost:3000. API health: http://localhost:5000/api/health.

Set `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api` in `frontend/.env.local` if the API runs elsewhere. The landing page shows a connected health status where available; the client list area is explicitly illustrative and is not backed by client CRUD yet.

## Database setup

1. Confirm whether the intended database should be on the PostgreSQL 14 socket instance or the separate PostgreSQL 18 server in pgAdmin. For the verified 14 instance, the observed role is `thakkifilyas`, the configured port is `5432`, and `agency_os_db` does not exist. No password was inspected or inferred.
2. Create `agency_os_db` on the chosen instance using the intended development role.
3. Set `DATABASE_URL` in `backend/.env`, for example `postgresql://ROLE:PASSWORD@localhost:PORT/agency_os_db?schema=public` (URL-encode reserved characters in credentials).
4. Run `npm run prisma:generate`, then `npm run prisma:migrate -- --name foundation` from `backend/`.

The schema is a standalone development contract for the canonical Agency OS entities and is not yet validated against the separate common integration standard. Review it against the upstream shared models before integration. No migration has been run against your database.

## Verification

From `frontend/`: `npm run lint`, `npm run build`.
From `backend/`: `npm run build`, `npm test`, `npm run test:e2e`.

## Status and next work

The application shell, health endpoint, API response/error boundary, validation, Prisma schema and handover docs are foundations. Authentication, agency context, RBAC enforcement, client CRUD, requirement workflows, communications, uploads, activity timeline and confirmed-requirement export are pending. Do not deploy this foundation as an authenticated multi-tenant production system.

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md), [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), and [docs/HANDOVER.md](./docs/HANDOVER.md).
