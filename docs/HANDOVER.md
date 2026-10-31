# Handover — Task 04

## Completed

- Read and preserved the existing Task 03 client/requirement foundation and verified the migration chain before changing it.
- Added agency-scoped `ClientCommunication` and `ClientAsset` records, same-agency composite relationships, nullable client/requirement links on `AuditLog`, and a dedicated timeline event timestamp.
- Implemented communication creation/listing with type/date filters, pagination and `occurredAt` separate from `createdAt`.
- Implemented client/requirement file upload and external references. Local files use generated keys, a 10 MB allowlist/signature check, authorized API downloads, and soft removal. Raw storage paths/keys are not returned.
- Implemented a paginated `AuditLog` timeline, including client/requirement/communication/file/reference events, safe descriptions, actor and linked requirement.
- Connected Communications, Files / References and Activity panels in the existing Client Workspace. No second app shell or external integration was added.
- Added two additive migrations: collaboration entities/audit foreign keys with existing requirement event backfill; and `AuditLog.eventAt` with timestamp backfill. No reset/drop was used.

## Files and data flow

- `backend/src/client-hub/client-collaboration.controller.ts`: API routes, upload and binary download boundary.
- `backend/src/client-hub/client-collaboration.service.ts`: tenant validation, transaction/audit creation, filters, pagination and timeline mapping.
- `backend/src/client-hub/local-asset-storage.service.ts`: development-only local storage, filename/type/size/signature validation and generated-key path checks.
- `backend/src/client-hub/collaboration.dto.ts`: query/body validation.
- `backend/prisma/schema.prisma` and `backend/prisma/migrations/`: entities, composite FKs and event indexes.
- `frontend/components/client-hub/{communications-panel,assets-panel,timeline-panel}.tsx`: typed API-backed UI panels mounted in the existing client workspace.
- `frontend/lib/api/client.ts`: typed response records and JSON/multipart request helper.

Frontend sends JSON or multipart data to Nest. DTOs reject unexpected fields. The service obtains actor agency/user/permissions from the server context, checks the client and optional requirement within that agency, then writes the business row and `AuditLog` row in a Prisma transaction. Composite foreign keys provide a second ownership boundary. File downloads resolve the database record by asset ID and agency before opening a generated, validated local storage key.

## Storage and security limitations

No approved object-storage integration existed in the repository. Files currently use a private, local development adapter in ignored `backend/storage/client-hub/`; accepted types are PDF, JPEG, PNG and WebP, maximum 10 MB. In production, upload returns 503. The adapter does not claim production storage security. Select the Agency OS approved storage provider and retention/purge policy before deployment. Removed file records are soft-deleted; local file bytes are retained pending that policy.

The dev actor remains disabled in production. Replace it with the shared Agency OS JWT/RBAC provider. WhatsApp/email/calendar sync is not present; communication entries are manual.

## Migration and verification

Migration history is in `backend/prisma/migrations/`; migration notes are in that directory’s README. Prisma status was verified before changes; Task 04 migrations applied successfully to local PostgreSQL 18.6 at `localhost:5433`, database `agency_os_db`, role `postgres`. No passwords are documented or logged.

Commands and results:

- `npx prisma validate` — schema validation passes.
- `npx prisma migrate deploy` — applies tracked migrations without schema reset; Task 04 migrations applied.
- `npm run prisma:seed:dev` — idempotently grants local development role permissions for client, requirement, communication and file actions.
- Backend `npm run build` — passed.
- Backend `npm test -- --watchman=false` — passed; includes workflow/security and local-file validation unit tests.
- Backend `npm run test:e2e` — passed against PostgreSQL; covers existing requirement workflow, communication filters/dates, invalid relationships, uploads/downloads, removal, tenant isolation and timeline ordering.
- Frontend `npm run lint`, `npx tsc --noEmit`, `npm run build` — passed.
- `git diff --check` — passed after final edits.

The PostgreSQL adapter emits a `pg@9` concurrency deprecation warning during e2e tests; all tests pass. No dependency was added. No commit or push was made. The prior user change to `frontend/next-env.d.ts` is preserved.

## Interview questions

- **How do you prevent cross-agency requirement links?** Service checks bind `clientId` and `requirementId` to the actor agency and same client; composite database FKs enforce the relationship again.
- **How do file downloads avoid path traversal?** The caller supplies only an asset UUID; the database lookup is agency-scoped, and storage uses an internally generated UUID key validated against a strict pattern and resolved under the private storage root.
- **Why separate `occurredAt`, `eventAt` and `createdAt`?** They respectively represent when a conversation happened, when the activity should appear in the timeline, and when the record was persisted.
- **Why use `AuditLog` for the timeline?** Existing workflow events already use it; adding client/requirement links and a safe event projection avoids a duplicate activity store.
- **What changes before production?** Replace development actor/local files with shared JWT/RBAC and approved object storage, then define retention, quotas and malware scanning policy.

## Tanglish summary

Communication logs, files/references, timeline ellam existing client workspace-la connect pannirukken. Ella request-um actor agency scope-la validate aagum; file download-um asset ID moolama authorize pannitu private local storage-lendhu stream pannum. Local storage demo/dev-kku mattum; production-la approved storage provider and JWT auth connect pannanum.

Suggested commits: `feat: add client communications and audit timeline`; `feat: add secure client files and references`; `test: cover tenant isolation and collaboration APIs`; `docs: document collaboration storage and timeline`.
