# Architecture

## Runtime shape

```text
Next.js App Router (port 3000)
       │ REST /api
       ▼
NestJS (port 5000) ── Prisma adapter ── PostgreSQL
```

The frontend owns presentation and typed API calls. Nest controllers map HTTP routes, services hold use-case logic, DTOs are the boundary for future writes, and global pipes/filters/interceptors enforce shared HTTP behavior. The health route is deliberately independent of database connectivity.

## Tenant and authorization boundary

The Prisma foundation carries `agencyId` on tenant-owned canonical records. `AgencyActor`, `CurrentActor`, `AuthenticatedAgencyGuard`, `PermissionGuard`, and `assertAgencyOwnership` define integration seams. No JWT strategy is wired yet, so there are no authenticated business endpoints. A future token verifier must populate the request actor from a verified token; controllers must never accept a caller-selected agency as authority. Cross-agency relationships (for example, a project and client) require same-agency validation in service transactions before writes.

## Persistence

`backend/prisma/schema.prisma` is a minimal local contract for the canonical entities listed in the assignment. It is not asserted to match the separate Agency OS integration standard because that PDF could not be fully text-extracted in this environment. The repository had no prior Prisma models, migrations, client services or connection configuration. Prisma 7 CLI configuration lives in `prisma.config.ts`; runtime PostgreSQL uses the official `@prisma/adapter-pg` adapter. `PrismaModule` is included but stays dormant when `DATABASE_URL` is absent, so the API health endpoint remains usable without pretending the DB is connected.

## Frontend

The reusable `AppShell` provides responsive navigation, workspace identity and account controls. Design tokens live in `app/globals.css`. The client list rows are explicitly illustrative. The API status badge reads the real health endpoint and reports checking, connected or unavailable states.

## Extension points

Add requirement and communication entities only after comparing them with shared Agency OS definitions. Keep requirement confirmation and export as a versioned integration contract rather than coupling it to a UI-only shape. Keep file storage behind a provider boundary; uploaded bytes and reference links should have separate validation rules.

The requirement brief’s partially recoverable text exposed the labels `DRAFT`, `UNDER_REVIEW`, and `CONFIRMED`. Treat those as a partial clue only: verify the full workflow and allowed transitions in the original brief before encoding them in the schema or API.
