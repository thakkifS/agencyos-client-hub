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

## Client and requirement form hardening

### Implemented

- Added `ClientForm` and reused it for client creation and editing. The form trims text, validates the contact name (including initials and common punctuation), provides a country selector, validates phone numbers with `libphonenumber-js`, normalizes them to E.164, trims/lowercases email, validates HTTP(S) websites and prefixes `https://` for `www.` input. It requires at least one of email, phone or website. Email is optional by itself, following the explicit at-least-one-contact-method rule; shared inboxes may appear on multiple clients. Company names are case-insensitively unique within an agency.
- Added a Next.js App Router AgencyOS mark at `frontend/app/icon.svg`.
- Requirements may be saved as incomplete drafts. Structured item rows now persist Functional/Non-functional type and Pending/Clarification/Accepted state alongside title, description, priority and sort order; up/down controls remain available as keyboard-friendly alternatives to drag and drop.
- Review and confirmation now validate required content and optional reference, budget, currency, timeline/date and text limits on the server. The form includes service choices, structured items, optional budgets and dates, internal-only assumptions, and reference URL deduplication/limits.
- Added migration `20261104120000_client_and_requirement_validation`. It adds enums/columns, client field limits, a normalized company-name unique index, and additive `NOT VALID` checks for applicable existing data. It was applied using `npx prisma migrate deploy` to verified PostgreSQL 18.6 at `localhost:5433`, database `agency_os_db`. No reset/drop was run.
- Fixed partial client updates so omitted optional DTO fields no longer replace persisted values with `undefined`.

### Validation and compatibility notes

The migration preflight found one legacy client without a primary contact name and three legacy phone values that are not canonical E.164. Existing rows were not changed. The database’s `NOT VALID` contact check leaves those rows in place, while newly inserted/updated client records must satisfy the contact check. The API permits an unchanged legacy phone while other fields are edited; replacing the phone requires a valid international number. This is a gradual compatibility boundary, not a cleanup of old data.

At least one of email/phone/website is required. The email field itself is optional under that rule despite the initial “Email required” phrase in the request. A country selection is used by the UI for local phone parsing; the backend contract accepts internationally qualified phone values and stores normalized E.164. Email is not unique; the company name is.

### Verification after changes

- `npx prisma validate` — passed.
- `npx prisma migrate status` — after deploy, confirmed **4 migrations found; database schema is up to date** on the verified local PostgreSQL 18 database.
- Backend unit tests: **3 suites, 8 tests passed**.
- PostgreSQL API e2e tests: **3 suites, 6 tests passed**. Added trim/case-insensitive duplicate company check, initial/punctuation contact names, website `www.` normalization, email trimming/lowercasing, valid E.164 phone acceptance, missing contact method and invalid phone rejection. Invalid dates, zero timelines and invalid currencies are rejected. Existing requirement and collaboration workflows passed.
- Backend production build — passed.
- Frontend ESLint — passed.
- Frontend TypeScript `npx tsc --noEmit` — passed.
- Frontend production build — passed; `/icon.svg` is listed by Next.js.
- PostgreSQL adapter still emits a `pg@9` concurrency deprecation warning during e2e tests; it does not fail the tests.

### Interview explanation (English / Tanglish)

The browser form improves usability, but it is not the security boundary: DTOs and services repeat validation, and PostgreSQL adds length/contact/uniqueness checks. Phone numbers use a maintained numbering-plan library and are stored in a consistent international format. Draft requirements remain saveable before they are complete; the server enforces completeness when the user advances to review/approval. Confirmed versions continue to use the existing immutable revision snapshots.

Tanglish: UI-la error seekiram kaamikkirom; aana API-um database-um same rules enforce pannum. Draft incomplete-aa save pannalaam; review/confirm time-la mattum mandatory details ellam check aagum. Phone country select panni validate pannitu E.164 format-la store pannrom. Existing legacy values-ai migration-la overwrite pannala.

Likely interview questions:

1. **Why validate in multiple layers?** UI gives immediate feedback; DTO/service validation protects all API clients; database constraints protect integrity if another code path writes directly.
2. **Why are drafts nullable?** The workflow explicitly allows saving incomplete work. Completeness is enforced at a state transition, rather than blocking draft persistence.
3. **Why not make email unique?** Client organizations can share contact inboxes. Company names are agency-scoped and normalized for duplicate prevention; email remains a validated contact method, not an identity key.

Suggested Task 05 commits (do not commit automatically): `test: strengthen client workflow and fixture isolation`; `feat: add repeatable fictional demo seed`; `docs: add QA traceability and interview handover`.

## Final Browser QA and demo readiness

### Verification distinction

- **Verified through browser:** None. No browser automation tool, Playwright/Puppeteer executable, or Chrome/Chromium binary was available. The frontend (`localhost:3000`) and API (`localhost:5000`) were not running at the time of the HTTP smoke check, so both connection attempts returned HTTP status `000`. I did not claim browser interaction.
- **Verified through automated tests:** Client CRUD/search/pagination APIs; workspace data APIs; requirement item add/edit/reorder; review, changes requested, reconfirmation, immutable version history and export; communication creation/filter/date validation; file/reference create, validation, authorized download and soft removal; tenant isolation and timeline ordering/redaction. The prior section records the passing Jest/e2e totals.
- **Reviewed in code only:** Loading/empty/error/success rendering; responsive Tailwind breakpoints/overflow; form labels and semantic headings; keyboard focus styling; dialog labels; status badges and responsive tables. This does not verify real viewport rendering or keyboard/screen-reader operation.
- **Not verified:** Actual desktop/tablet/mobile browser layouts; end-to-end clicks through UI; browser keyboard traversal, focus visibility, screen-reader behavior; browser-native file download; visual validation/error messages; visual API loading/empty states.

### Fix made

Added a global `:focus-visible` outline using the existing primary design token in `frontend/app/globals.css`. This supplies a visible keyboard focus indicator to controls that did not use the shared Button component. It is a code-level accessibility improvement; the visible result still needs browser confirmation.

After this change, `npm run lint`, `npx tsc --noEmit` and `npm run build` in `frontend/` all passed.

### Manual browser checklist

Start PostgreSQL and confirm ignored `backend/.env` contains the already-verified local connection and development actor settings. Do not print or share the secret URL. If needed, run `npm run prisma:seed:dev` and `npm run prisma:seed:demo` from `backend/`; these are additive/idempotent development seeds and do not reset the database. Start API with `npm run start:dev` in `backend/`, then start frontend with `npm run dev` in `frontend/`. These commands launch the existing apps for interactive review; expected URLs are `http://localhost:5000/api/health` and `http://localhost:3000`.

Use a newly created client named `QA DEMO · <your initials> · <date>` for destructive-looking actions such as soft removal, so no existing or shared demo records are changed. Keep the new fixture for review or remove it only through the app’s documented soft-remove action where applicable.

1. **Client list/search/pagination:** Open Client Hub. Search `DEMO · Northstar Coffee`, clear search, and use Previous/Next with page size as presented. Confirm rows and page indicator update; narrow the viewport and check the table scrolls without stretching the page.
2. **Create/edit client:** Add the uniquely named QA client with a fictional contact/email. Open its workspace, edit its phone/contact, save, reload, and confirm the values persist and a success message appears.
3. **Workspace and empty states:** Open the new client. Check Overview, Requirements, Communications, Files / References and Activity links navigate to their sections. Confirm the new client has meaningful no-record messages for communications/files/activity.
4. **Requirement creation:** Add a requirement with title, business objective, services, and at least two items with distinct descriptions/priorities. Fill optional budget/currency/timeline and constraints/assumptions. Save and confirm it appears with DRAFT status.
5. **Requirement edits and ordering:** Edit the draft, change a field, use item up/down controls to reorder, save, reload, and verify the order persisted.
6. **Review and confirmation:** Use the requirement’s status actions to submit for review, then confirm. Verify the status badge, confirmer/time metadata, and revision history.
7. **Changes/revision:** Request changes on the confirmed requirement, edit content and items, submit again, and reconfirm. Open detail and verify versions 1 and 2 remain. Try editing while confirmed and confirm the server rejects the change; refresh and ensure the approved content remains.
8. **Confirmed export:** Request `/api/requirements/<id>/export` in browser or an authenticated local API client while the record is confirmed. Confirm the approved version and structured items are present. Try with an unconfirmed requirement and expect a clear conflict response.
9. **Communication:** Add a meeting associated with the requirement, participants, occurred-at time and follow-up notes. Filter by type and date. Verify subject, summary, participants, linked requirement and follow-up display; clear filters and paginate if multiple pages exist.
10. **File and reference:** Upload a fictional PDF/JPEG/PNG/WebP under 10 MB, download it, then soft-remove it and verify it disappears from active rows and download is denied. Add an `https://example.org/...` reference and open it in a new tab. Do not use real client files.
11. **Timeline:** Confirm client creation/update, requirement transitions/revisions, communication and file/reference events appear newest-first. Check tied timestamps remain stable and the timeline shows no private note body or raw audit metadata.
12. **Validation/errors/success:** Submit blank required fields and verify native/inline validation. Try an invalid URL or unsupported/oversized file and verify readable API errors. Confirm each successful save displays feedback and does not double-submit.
13. **Loading/empty states:** Throttle network in browser DevTools to observe loading states, then test the new client’s empty panels. Temporarily stop the API to verify a visible error rather than demo rows; restart it afterward.
14. **Desktop/tablet/mobile:** Review widths around 1440 px, 768 px and 390 px. Check sidebar-to-mobile navigation, no page-level horizontal overflow, readable controls, modal scrolling, and tables/rows remain usable.
15. **Keyboard/basic accessibility:** Starting at the address bar, use Tab and Shift+Tab through navigation, forms, list actions, dialog, and pagination. Confirm focus outline is visible, labels announce fields, Enter submits forms, Space/Enter activate buttons, Escape/close behavior is understandable, and focus is not lost behind an open dialog. Repeat with a screen reader if available.

Tanglish: Browser automation available illa; adhanala browser test panninen-nu claim pannala. `globals.css`-la keyboard focus outline add pannirukken. Mela irukkira checklist-la QA-nu prefix ulla fictional client use panni browser-la manually verify pannunga; existing demo/database records reset panna vendam.

## Task 06 handover update

- `/overview` displays live tenant-scoped Client Hub metrics, recent clients, requirements needing attention, communications, files/references and activity from `GET /api/client-hub/overview`.
- Sidebar destinations include the overview and clients; the other Client Hub entries point to real sections on the overview. Mobile uses a dismissible navigation drawer.
- `/login` is intentionally a local development preview, not production authentication. No credentials are collected. Production login requires the approved shared identity provider, JWT/session verification, frontend route protection and authentication tests. The API development actor remains disabled in production.
- The provided `frontend/app/icon.png` is used through Next.js App Router icon discovery.
- Verification run for this task: frontend lint/type-check/production build; backend build/unit tests; Prisma validation. Backend API integration tests passed: 3 suites / 7 tests. PostgreSQL 18 database at localhost:5433 reports all 4 migrations applied. Test output included a pg client.query concurrency deprecation warning; tests passed. No browser automation is configured; perform manual responsive and keyboard checks at 375px, 768px and 1440px.
