# Architecture

## Runtime and request flow

```text
Next.js App Router (3000) → typed REST client → Nest controller / DTO validation
                                              → ClientHubService → Prisma 7 adapter → PostgreSQL 18
```

`AppShell` supplies the Agency OS navigation and design tokens. Frontend API failures are surfaced as errors rather than replaced with illustrative client rows. Controllers stay thin; `ClientHubService` owns agency scoping, state transitions, transactional writes and revision snapshots. Prisma models retain the canonical Agency, User, Role, Permission, Client, Project, Task, Notification and AuditLog entities. `ClientNote` did not exist in the repository, so the schema now adds a small agency-linked note model.

## PostgreSQL and migrations

Prisma 7 reads CLI configuration from `backend/prisma.config.ts`; runtime uses `@prisma/adapter-pg`. The local target was verified as PostgreSQL 18.6 at `localhost:5433`, database `agency_os_db`, role `postgres`. A non-destructive identity/catalog inspection found no public business tables or migration table before setup. The reviewed first migration creates the canonical and Client Hub tables and constraints; it has no drops or resets. Migration history is committed in `backend/prisma/migrations/`.

All tenant-owned records carry `agencyId`. Relations such as Requirement→Client, Requirement→Preparer, Project→Client and Task→Project use composite same-agency foreign keys. Services additionally scope reads and writes by actor agency and resolve related clients within that agency.

## Requirement workflow and versioning

The server validates transitions and authorization. Proposed transitions: DRAFT→UNDER_REVIEW/ARCHIVED; UNDER_REVIEW→DRAFT/CHANGES_REQUESTED/CONFIRMED/ARCHIVED; CHANGES_REQUESTED→DRAFT/UNDER_REVIEW/ARCHIVED; CONFIRMED→CHANGES_REQUESTED/ARCHIVED; ARCHIVED terminal. These edges are a policy choice, not prescribed by the task PDF.

Confirmation runs in a transaction: set confirmer/time, snapshot the requirement and ordered items/references in `RequirementRevision`, and append `AuditLog`. The `version` is per requirement and unique. Content snapshots are JSON-safe (Decimal values as strings, timestamps as ISO strings). Ordinary PATCH rejects CONFIRMED and ARCHIVED records; revisions to a confirmed requirement must pass through CHANGES_REQUESTED and reconfirmation. Export reads the highest approved snapshot and requires active CONFIRMED status.

## Development identity and production boundary

There is no shared JWT provider in this standalone assignment repository. For local development, `DevelopmentActorGuard` is enabled only when `ENABLE_DEV_AUTH=true`, `NODE_ENV` is not production, and the configured `DEV_ACTOR_EMAIL` resolves to the seeded development user. Actor agency, user and permission claims are read from PostgreSQL, not request data. Do not enable this adapter in deployed environments. Replace it with the Agency OS JWT verifier and shared RBAC policy. API-level authentication is not production-ready.

## Next phase

Communications, file upload/storage and a unified activity timeline have placeholder contracts only. Implement them through shared Agency OS entities/services before adding quotations, invoicing or delivery modules. No unrelated modules are included.
