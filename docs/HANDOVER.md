# Handover

## Completed in Task 03

- Read both supplied PDF requirements and retained the mandated Next/Nest/PostgreSQL/Prisma stack and Agency OS palette.
- Verified a read-only connection to PostgreSQL 18.6 at `localhost:5433`, database `agency_os_db`, role `postgres`. The target had no public application tables or migration history. Reviewed an additive initial migration and applied it without reset/drop operations.
- Added agency-scoped `ClientNote`, `ClientRequirement`, `RequirementItem`, `RequirementReference`, and `RequirementRevision` models while reusing the existing canonical Client and shared Agency OS entity contracts.
- Added development-only seeded actor and server-derived agency context; no JWT issuer/provider exists yet.
- Implemented client search/pagination/create/detail/update/hub endpoints, requirement CRUD/status/export APIs and connected frontend client/workspace screens.
- Added transaction-based structured item persistence, same-agency relations, confirmation snapshots, audit events, and approved-version export.
- Added API integration tests for client/requirement creation, confirmation/export, protected edits and cross-agency denial.

## Workflow policy

The specification prescribes five status labels but not every transition. Implemented proposed transitions: DRAFT → UNDER_REVIEW/ARCHIVED; UNDER_REVIEW → DRAFT/CHANGES_REQUESTED/CONFIRMED/ARCHIVED; CHANGES_REQUESTED → DRAFT/UNDER_REVIEW/ARCHIVED; CONFIRMED → CHANGES_REQUESTED/ARCHIVED; ARCHIVED terminal. Confirmed and archived requirement PATCH is rejected. Changes requested on confirmed content retain historical snapshots; reconfirmation creates the next version. The export endpoint requires current status CONFIRMED and returns the latest snapshot.

## Pending / limitations

- Production JWT authentication and shared Agency OS permission-provider integration.
- Communications, uploaded files/storage, and activity timeline; workspace returns explicit unavailable contracts.
- A standalone development schema/migration was used because canonical shared application services were not present in this repository. Confirm migration compatibility with the parent Agency OS before integration.
- Frontend includes connected create/edit/status flows and a dedicated requirement detail route. More fine-grained permission UX remains future polish.

## Commands and observed checks

- `npx prisma validate` — passed.
- `npm run prisma:migrate -- --name client-hub` — additive migration created and applied successfully to verified local database.
- `npm run prisma:seed:dev` — passed; local-only fixture rows are created/upserted without secrets in source.
- Backend `npm run build` — passed.
- Backend `npm test -- --watchman=false` — passed (health unit test).
- Backend `npm run test:e2e` — passed (2 suites, 3 tests) against PostgreSQL. The pg adapter emitted a `pg@9` query concurrency deprecation warning; no test failures.
- Frontend `npm run lint`, `npx tsc --noEmit`, `npm run build` — passed after the structured editor expansion.

No commits or pushes were made. The existing user change to `frontend/next-env.d.ts` was preserved. Local credentials remain in ignored `backend/.env` and are not reproduced here.

## Suggested commits

1. `feat: add agency-scoped client and requirement APIs`
2. `feat: add client workspace and requirement workflow UI`
3. `test: cover tenant isolation and requirement confirmation`
4. `docs: document database and local development workflow`

## Interview prompts with short answers

- **Why composite tenant foreign keys?** They make cross-agency links invalid in the database as well as in service checks.
- **How is a confirmed requirement protected?** Regular edits are rejected; confirmation snapshots create immutable versions in the same transaction as status/audit changes.
- **How does export avoid draft leakage?** It checks the active status and returns the latest confirmed snapshot, not the mutable working state.
- **Where does agency identity come from?** From a verified actor context resolved server-side; the local adapter derives it from a configured seeded user and must be replaced by shared JWT authentication for production.
- **Why keep health independent of PostgreSQL?** Liveness can still report a running API when database integration is unavailable; a separate readiness probe should check storage in a deployed environment.

## Short Tanglish explanation

Client data agency scope-la filter aagum; requirement create/edit/status change ellam Nest service moolama validate aagi Prisma transaction-la PostgreSQL-ku pogum. Confirm pannina udane approved snapshot version save aagum; later changes old approved version-ai overwrite panna mudiyadhu. Local demo auth mattum irukku; production-la shared JWT auth connect pannanum.
