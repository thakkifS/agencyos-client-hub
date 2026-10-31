# Handover — Task 04

> Task 04 implementation notes are retained below. Task 05 final QA results and additional changes follow.

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

## Task 05 — Final QA and interview handover (2026-11-01)

### Specification audit

Both supplied Neirah Tech PDFs were read during the prior project phase. The full compliance mapping is in [REQUIREMENTS_TRACEABILITY.md](./REQUIREMENTS_TRACEABILITY.md). It marks production identity/storage and automated viewport accessibility verification as partial, and distinguishes implemented API workflows from limitations. No claim of production JWT or object storage is made.

### Verification results

- Backend unit tests: **3 suites passed, 8 tests passed**.
- PostgreSQL API e2e tests: **3 suites passed, 5 tests passed**. Coverage includes client create/update/search/pagination, requirement item creation/reorder, review/changes/revision/reconfirmation, immutable v1 and v2 export, communications filters/date validation/requirement links, upload validation, download authorization, soft removal, timeline ordering/redaction, and tenant isolation.
- Prisma schema validation: **passed**.
- PostgreSQL migration status: **3 migrations found; schema up to date** on local PostgreSQL 18.6 at `localhost:5433`, database `agency_os_db`.
- Prisma datasource-to-schema diff: **empty migration**, so no untracked schema drift was found.
- Frontend ESLint and TypeScript check: **passed**.
- Frontend production build: **passed**; generated `/`, `/clients`, `/clients/[id]`, and `/clients/[id]/requirements/[requirementId]` routes.
- Backend production build: **passed**.
- `git diff --check`: **passed** before final documentation-only updates; rerun before submission.
- `npm audit --omit=dev`: **0 production dependency vulnerabilities** reported for backend and frontend.
- Full `npm audit`: backend **23 development-tree advisories (4 low, 19 moderate)**; frontend **16 moderate**. The reported paths are indirect development tools (Jest/Nest CLI glob stack and ESLint/TypeScript ESLint minimatch stack). Non-force `npm audit fix` found no compatible updates. npm recommends `--force`, which would request breaking major changes (Nest CLI 12 / ESLint 4); that was not applied. Re-evaluate toolchain upgrades separately.
- E2E emits a warning from the PostgreSQL adapter stack about `pg@9` query concurrency deprecation; current tests passed.

The e2e fixture cleanup was tightened during QA: it now removes only records created with that test’s UUID, and no longer sweeps arbitrary client rows by name prefix. E2E exercises the main workflows, though it is not a browser-driven UI test and does not cover every possible malformed input or permission combination.

### Functional scenario status

| Scenario | Evidence / status |
|---|---|
| Create client and open workspace | E2E API create/update/workspace flows; frontend workspace route exists |
| Structured requirement with multiple items; edit/reorder | E2E passes |
| Submit, request changes, revise and reconfirm | Extended e2e workflow passes |
| Preserve first snapshot; reject normal confirmed edit | E2E asserts v1 retained and edit rejected |
| Export approved version | E2E asserts v2 export payload and version |
| Log communication and link requirement | E2E passes; filters and date validation exercised |
| Upload supported PDF, authorized download, soft removal | E2E passes |
| Add external reference | E2E creates and lists a reference |
| Chronological, redacted client activity | E2E checks descending time, tie-break, safe note projection and tenant scope |
| Search, filters, pagination | Client search/page navigation and communication type/date filters tested |

### Security and database review

Agency identity is resolved by the development guard from the configured user, never from a request body. Service queries are tenant-scoped and relevant relations use composite same-agency foreign keys. Existing e2e checks reject foreign-tenant client, requirement, communication, file and timeline access/link attempts. File uploads validate extension, MIME, size and signature; path-like filenames are reduced to display names, storage keys are generated server-side, and retrieval first authorizes the database asset by agency. URL validation permits only HTTP(S), and URLs are not fetched. Raw timeline metadata and note bodies are excluded.

The development actor is disabled in production; it is not production authentication. Local files are development-only; no production object-storage security, malware scan or retention purge is claimed. JWT/RBAC, production storage provider and retention/quota policy remain deployment integration requirements. `backend/.env` was not read into output and must remain ignored; do not share its values.

Migration review found the three tracked migrations applied and an empty schema diff. No reset/drop was performed. `prisma:seed:demo` adds stable-ID fictional examples with empty update clauses and production guard; it leaves existing records as-is. It was run successfully against the verified local database.

### UI review

Source review confirmed the current workspace tabs/forms, small-screen wrapping/scroll containers, status and API error/success/empty/loading states; lint and production build pass. This is not equivalent to a real desktop/tablet/mobile browser session or automated accessibility audit. The development workspace uses a fixed local actor, and the navigation shell is responsive but no keyboard/screen-reader certification is claimed.

### Files changed for Task 05

- `backend/prisma/demo-seed.ts` and backend package script: repeatable fictional sample clients and related workflow records.
- `backend/test/client-hub.e2e-spec.ts`: review/change/revision/reconfirmation/export assertions, client search and pagination; removed broad prefix cleanup.
- `README.md`, `API_DOCUMENTATION.md`, `docs/ARCHITECTURE.md`, `docs/HANDOVER.md`: seed commands, verification boundaries and final results.
- `docs/REQUIREMENTS_TRACEABILITY.md`: source-to-code-to-test matrix.
- `docs/INTERVIEW_PREPARATION.md`: interview explanations, Tanglish summary and likely Q&A.

### Interview demonstration

1. Configure ignored `backend/.env` with the verified local PostgreSQL URL and development actor settings; never put credentials in Git.
2. From `backend/`, run `npm run prisma:seed:dev`, then `npm run prisma:seed:demo`.
3. Start API (`npm run start:dev`) and frontend (`npm run dev` from `frontend/`).
4. Open the Client Hub. Demo clients are prefixed `DEMO ·`; inspect the draft, review and confirmed examples, then open communication, references and timeline tabs.
5. To demonstrate approval behavior, create a new client/requirement, submit it for review, confirm it, request changes and reconfirm. Show that the prior revision remains and export reports the approved version.

Tanglish: `DEMO` records fictional; seed rerun panna duplicate create aagadhu, existing content overwrite aagadhu. Requirement approve pannina snapshot version preserve aagum; production auth/storage mattum innum integrate pannanum.

Suggested Task 05 commits (do not commit automatically): `test: strengthen client workflow and fixture isolation`; `feat: add repeatable fictional demo seed`; `docs: add QA traceability and interview handover`.
