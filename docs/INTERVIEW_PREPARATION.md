# Interview preparation — Agency OS Client Hub

## Project overview

This is a Neirah Tech interview project for recording client information, structured requirements, requirement approvals, communications, reference files and client activity. It is a working standalone foundation and workflow, not a complete production Agency OS deployment.

**Tanglish:** Client details, requirements, approvals, communications, files, activity ellam oru workspace-la manage panna indha project.

## Architecture and technology choices

Next.js App Router renders the workspace and uses a typed REST client. NestJS separates controllers, DTO validation and service logic. Prisma 7 maps PostgreSQL records and migrations. The PostgreSQL database is the durable source; the browser never provides trusted agency identity.

**Tanglish:** Frontend API call pannum; Nest validation panni service logic execute pannum; Prisma PostgreSQL-la save pannum.

## Database design

Canonical Agency, User, Role, Permission, Client, Project, Task, Notification and AuditLog models form a minimal standalone-compatible development foundation. Client-owned records carry `agencyId`. Composite foreign keys bind related client, requirement, user and audit rows to the same agency. Money is Decimal in the database; API snapshots serialize it safely.

## Client and requirement workflow

Client list/details are scoped to the active actor agency. A requirement has a structured main record and ordered `RequirementItem` rows. Editing items takes place transactionally: old rows move to temporary ordering slots, then final order is applied without unique-order collisions. Status transitions are checked in the service, not just by buttons.

Proposed transitions: DRAFT → UNDER_REVIEW or ARCHIVED; UNDER_REVIEW → DRAFT, CHANGES_REQUESTED, CONFIRMED or ARCHIVED; CHANGES_REQUESTED → DRAFT, UNDER_REVIEW or ARCHIVED; CONFIRMED → CHANGES_REQUESTED or ARCHIVED; ARCHIVED is terminal. The source defines statuses and business rules but not every edge, so this matrix is the application’s documented policy.

**Tanglish:** Status change backend-la validate aagum. Frontend button hide pannradhu mattum security illa.

## Confirmed versions

Confirmation writes the actor, time, immutable content snapshot and audit event in a Prisma transaction. The snapshot contains the requirement and ordered items. To revise an approved requirement, request changes, edit working content, submit and confirm again. A monotonic `RequirementRevision.version` preserves the prior snapshot. Export only serves the latest approved snapshot when the current requirement is confirmed.

## Tenant security and authentication boundary

The current guard resolves one configured development actor from the database and runs only outside production when explicitly enabled. It reads that user’s agency and permission keys from PostgreSQL. Services filter by actor `agencyId`, validate related ownership, and PostgreSQL composite FKs provide another boundary. Production JWT verification and shared Agency OS RBAC are not implemented and must replace this guard before deployment.

**Tanglish:** Browser anuppura agencyId trust panna maattom; logged-in actor context database-lendhu varum. Ippo local demo identity dhaan, production JWT innum integrate pannala.

## Communications, files and timeline

Communication rows separate `occurredAt` (when the conversation happened) from `createdAt` (when it was recorded). Logging is manual; no external messaging/calendar sync exists. File uploads use a local-only adapter, size/type/signature checks, generated UUID keys and agency-authorized download routes. External links must be HTTP(S); server does not fetch them. Removal soft-deletes the database reference and retains bytes. AuditLog plus ClientNote projections form the timeline; the API maps allow-listed event descriptions and omits raw metadata/private content.

Production requires shared JWT/RBAC, approved object storage, malware scanning, retention/purge policy and storage quotas.

## API and tests

Nest controllers receive validated DTOs and call focused services. The response interceptor wraps JSON results in the standard envelope; binary downloads intentionally stream file bytes. Jest unit tests cover service/storage rules; API e2e tests use PostgreSQL and UUID-scoped fixtures, then clean only those test fixtures. Frontend lint/type-check/build and Prisma migration checks cover compile and schema integrity.

## Technical challenges and solutions

- **Tenant-safe relationships:** composite agency foreign keys plus service-level scopes.
- **Stable item ordering:** transactional temporary slots avoid unique constraint conflicts during reorder.
- **Approval history:** snapshot rows preserve exact confirmed content instead of overwriting the approved record.
- **Private local files:** generated storage IDs and database authorization prevent user-controlled path resolution.
- **Useful timeline:** reuse AuditLog, with an allow-listed read model to avoid exposing private payloads.

## Known limitations and integration points

Production identity/JWT, shared canonical entity package, object storage, malware scanning, messaging synchronization, deployment/observability and browser-based accessibility/device testing remain outside this standalone implementation. Health is liveness-only. There is no optimistic concurrency token for simultaneous edits.

## Likely technical questions

1. **Why Prisma with PostgreSQL?** Prisma gives typed queries and tracked relational migrations; PostgreSQL supplies transactions, constraints, composite keys and Decimal money.
2. **How do you stop cross-agency access?** Derive agency from the actor, scope every query, validate related records and enforce same-agency relations with composite FKs.
3. **Why preserve requirement revisions?** An approval is an agreement; immutable snapshots make later changes traceable and keep the approved export reproducible.
4. **How are item reorder conflicts avoided?** Update existing sort positions to temporary negative slots inside a transaction, then apply the final positions.
5. **How are files downloaded safely?** The API resolves an active asset by ID and agency, then the adapter validates a generated storage key beneath the private root.
6. **What does the current auth provide?** Development-only identity/permissions from a configured seeded actor; production JWT/RBAC still needs Agency OS integration.
7. **What is the timeline source?** AuditLog is the event record and ClientNote is projected as a safe note-added entry, sorted by event time then ID.
8. **How would you extend this for production?** Integrate shared JWT/RBAC, approved object storage, scanning/retention, readiness probes, optimistic concurrency and browser accessibility tests.

**Tanglish:** Interview-la clear-a sollunga: local flow functional; production auth/storage provider integrate panna baaki irukku. Confirmed snapshot history overwrite aagama preserve pannum.
