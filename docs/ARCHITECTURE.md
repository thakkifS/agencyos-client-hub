# Architecture

## Runtime and request flow

```text
Next.js App Router (3000) → typed REST client → Nest controller / DTO validation
                                              → ClientHubService → Prisma 7 adapter → PostgreSQL 18
```

`AppShell` supplies the Agency OS navigation and design tokens. Frontend API failures are surfaced as errors rather than replaced with illustrative client rows. Controllers stay thin; `ClientHubService` owns client and requirement workflows, while `ClientCollaborationService` owns communications, assets and timeline queries. Both scope records by the server-derived actor agency. Prisma models retain the canonical Agency, User, Role, Permission, Client, Project, Task, Notification and AuditLog entities. `ClientNote` did not exist in the repository, so the Phase 2 schema adds a small agency-linked note model.

## PostgreSQL and migrations

Prisma 7 reads CLI configuration from `backend/prisma.config.ts`; runtime uses `@prisma/adapter-pg`. The local target was verified as PostgreSQL 18.6 at `localhost:5433`, database `agency_os_db`, role `postgres`. Four additive migrations are tracked: the Phase 2 foundation, collaboration entities and audit links, `AuditLog.eventAt` with a backfill, and the client/requirement validation rules and draft item fields. The latest migration was applied locally. Checks are `NOT VALID` where old records may not satisfy the newly introduced rules; PostgreSQL still enforces them for new/updated rows. Existing data was not reset, dropped, or mass-normalized.

All tenant-owned records carry `agencyId`. Relations such as Requirement→Client, Communication→Client/Requirement, Asset→Client/Requirement, AuditLog→Client/Requirement, Project→Client and Task→Project use composite same-agency foreign keys. Services additionally scope reads and writes by actor agency and resolve related clients/requirements within that agency. Request DTOs reject foreign fields through whitelist validation.

## Requirement workflow and versioning

The server validates transitions and authorization. Proposed transitions: DRAFT→UNDER_REVIEW/ARCHIVED; UNDER_REVIEW→DRAFT/CHANGES_REQUESTED/CONFIRMED/ARCHIVED; CHANGES_REQUESTED→DRAFT/UNDER_REVIEW/ARCHIVED; CONFIRMED→CHANGES_REQUESTED/ARCHIVED; ARCHIVED terminal. These edges are a policy choice, not prescribed by the task PDF.

Draft title, objective and item text are nullable to support incomplete saved work. `validateRequirementForApproval` is the authoritative completion gate for review and confirmation, checking required content, approved service values, item fields, references, budget/currency, timeline/date and maximum text lengths. Item category/status are enums. A client’s primary contact is required; at least one of email, phone or website is required. Client form/API both trim values, detect duplicate company names within an agency, validate supplied contact methods, and normalize phone numbers to E.164 using `libphonenumber-js`. Email is not unique because shared contact inboxes are valid for multiple client accounts. Legacy phone strings were not rewritten; an unchanged legacy value is retained when editing other client fields.

Confirmation runs in a transaction: set confirmer/time, snapshot the requirement and ordered items/references in `RequirementRevision`, and append `AuditLog`. The `version` is per requirement and unique. Content snapshots are JSON-safe (Decimal values as strings, timestamps as ISO strings). Ordinary PATCH rejects CONFIRMED and ARCHIVED records; revisions to a confirmed requirement must pass through CHANGES_REQUESTED and reconfirmation. Export reads the highest approved snapshot and requires active CONFIRMED status.

## Development identity and production boundary

There is no shared JWT provider in this standalone assignment repository. For local development, `DevelopmentActorGuard` is enabled only when `ENABLE_DEV_AUTH=true`, `NODE_ENV` is not production, and the configured `DEV_ACTOR_EMAIL` resolves to the seeded development user. Actor agency, user and permission claims are read from PostgreSQL, not request data. Do not enable this adapter in deployed environments. Replace it with the Agency OS JWT verifier and shared RBAC policy. API-level authentication is not production-ready.

## Communications and files

Communication rows hold type, subject, summary, participants, `occurredAt`, optional follow-up and same-client requirement relation. Creation and audit event happen in one database transaction. `createdAt` remains distinct from occurrence time.

No approved object-storage provider existed in this repo. `LocalAssetStorageService` is therefore explicitly local-development-only and stores private bytes beneath ignored `backend/storage/client-hub/`. It generates UUID storage keys, accepts only PDF/JPEG/PNG/WebP up to 10 MB, checks the actual file signature, normalizes the display filename and never builds a download path from user input. Downloads first resolve an active asset by both ID and actor agency; `StreamableFile` sends private/no-store bytes with `nosniff`. References are HTTP(S) URLs and the server does not fetch them. Removal is soft (sets `deletedAt`), retaining local bytes; a production retention/purge policy and approved provider remain decisions for deployment. No cloud dependency was added.

## Unified timeline

`AuditLog` remains the event source for client, requirement, communication, and asset actions; the timeline also merges existing `ClientNote` rows as generic note-added events. New business actions append one audit row in the same transaction as their write. Client and optional requirement IDs have same-agency foreign keys; the Task 04 migration backfills existing requirement audit links. `eventAt` is separate from audit row creation and uses communication `occurredAt` where applicable. Timeline reads are agency/client-scoped, ordered by `eventAt DESC, id DESC`, paginated, and map allow-listed action codes to descriptions. Raw metadata and private note/communication/file content are never returned.

## Next phase

Replace the dev actor and local storage adapter with shared Agency OS JWT/RBAC and an approved production file store/retention design. Continue to avoid quotations, invoicing or delivery modules in this project phase.

## Final QA and handover

`REQUIREMENTS_TRACEABILITY.md` maps the two Neirah Tech specifications to implementation, test evidence and limits. `INTERVIEW_PREPARATION.md` describes only behavior present in code. Development demonstration rows are created by `backend/prisma/demo-seed.ts`; fixed IDs and empty update branches make it repeatable without overwriting existing records. API e2e tests use run-local UUID fixtures and remove only those exact fixture IDs.

## Task 06: Overview, navigation, and sign-in boundary

The `/overview` page calls `GET /api/client-hub/overview`. The Nest service aggregates client, requirement, communication, active file/reference, audit and note records in parallel, with every query filtered by the agency resolved from the server-side actor. The response returns counts and bounded recent lists; safe activity text is allow-listed and raw audit metadata is omitted. The responsive `AppShell` navigation links to the overview sections and client list. `/login` is a development preview only: this standalone repository has no shared identity provider, credential verification, JWT/session issuance or frontend route guard. The preview collects no credentials and is not authentication. `frontend/app/icon.png` is the Next.js App Router favicon.
