# Agency OS — Client Hub

Neirah Tech’s interview assignment: a client operating, communication and requirement management hub foundation, now connected to PostgreSQL and implementing client and requirement workflows.

## Stack and prerequisites

- Frontend: Next.js App Router, TypeScript, Tailwind CSS, Inter
- API: NestJS REST, DTO validation, Jest
- Persistence: PostgreSQL, Prisma 7 (`@prisma/adapter-pg`)
- Install Node.js 24 or later and npm. The inspected local machine reports Node 25.2.1 / npm 11.6.2. PostgreSQL 18 is configured locally at `localhost:5433`; database name `agency_os_db`, role `postgres`.

## Install and start

```sh
cd frontend && npm install && npm run dev
# second terminal
cd backend && npm install && npm run start:dev
```

Open `http://localhost:3000`; API liveness is at `http://localhost:5000/api/health`. Add `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api` to `frontend/.env.local` only if the API uses a different URL.

## Database

`backend/.env` is local and ignored. Set `DATABASE_URL` to the verified local PostgreSQL 18 connection string and keep credentials out of source and chat. `.env.example` has safe placeholders. This project uses Prisma 7 config in `backend/prisma.config.ts` and its PostgreSQL adapter.

The target `agency_os_db` was verified with a read-only identity query (PostgreSQL 18.6, localhost:5433, role `postgres`) and was empty before the initial migration. Three tracked migrations now cover the canonical/client requirement foundation, communications/assets and timeline links, and the timeline event timestamp. For a fresh configured database, apply tracked migrations with `npx prisma migrate deploy`; this does not reset data. `npx prisma migrate status` checks whether the schema is current. See [migration notes](./backend/prisma/migrations/README.md).

```sh
cd backend
npm run prisma:generate
npx prisma migrate status
```

The development-only actor seed requires local `DATABASE_URL`, `ENABLE_DEV_AUTH=true`, and `DEV_ACTOR_EMAIL` in ignored `backend/.env`:

```sh
npm run prisma:seed:dev
npm run prisma:seed:demo
```

The first command creates/upserts only a named development agency, a local admin role with client, requirement, communication and file permissions, and the configured local user. The second adds three clearly labeled fictional clients with draft, review and confirmed requirements, items, communications, reference links and activity. Both scripts are production-disabled; the demo script uses stable IDs and empty update branches so reruns do not overwrite existing data. Do not enable this adapter in production. Production identity/JWT is not implemented.

## Current capabilities

- Agency-scoped client list, name search, pagination, create, edit, details and workspace summary.
- Structured requirements with multiple ordered items, services, references, budget/currency, timing, preferences, constraints, assumptions and notes.
- Proposed server-enforced status transitions, confirmation permission, immutable confirmed versions, audit entries, and JSON export of the approved snapshot.
- Client communication and meeting logs with type/date filtering and requirement association.
- Client/requirement file uploads and external references, agency-authorized retrieval, soft removal and audit events.
- A paginated chronological timeline based on `AuditLog.eventAt`, with safe event descriptions and agency scope.

File bytes use a local development-only adapter at ignored `backend/storage/client-hub/`. It accepts PDF, JPEG, PNG and WebP up to 10 MB, checks MIME, extension and file signature, uses generated private keys, and streams content through an authorized API route. It is not a production storage provider; select an approved object-storage service before production. Removed assets are hidden in the UI and their bytes are retained pending a retention policy.

## Verification

```sh
# frontend/
npm run lint
npx tsc --noEmit
npm run build

# backend/
npx prisma validate
npm test -- --watchman=false
npm run test:e2e
npm run build
```

The database API integration tests use the configured local DB, create UUID-tagged fixture records, and remove only their own fixtures. They do not reset the database. Upload tests remove their own generated test object after checking API retrieval.

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md), [architecture](./docs/ARCHITECTURE.md), [requirements traceability](./docs/REQUIREMENTS_TRACEABILITY.md), [interview preparation](./docs/INTERVIEW_PREPARATION.md), and [handover](./docs/HANDOVER.md).
