# API documentation

Base URL: `http://localhost:5000/api`. All routes use the standard success envelope `{ "success": true, "data": ..., "message": "Operation completed successfully" }`. Errors are `{ "success": false, "message": "...", "code": "...", "details": {} }`. List responses include `{ items, pagination: { page, limit, total, pages } }`.

## Authentication

`POST /auth/signup` creates a new agency and its first Owner user; `POST /auth/login` verifies email/password. Both set a signed JWT in the HttpOnly `agencyos_session` cookie and return the user profile without exposing the token in JSON. Requests from the frontend must include credentials. `GET /auth/me` reads current account, agency and permissions from PostgreSQL. `POST /auth/logout` expires the session cookie.

Google OAuth is optional. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and a callback URL registered with Google. The local callback URL is `http://localhost:5000/api/auth/google/callback`. Google accounts must map to an existing active agency user; OAuth does not create or join an agency. `POST /auth/users` is restricted to users with `users:manage` and creates an account inside the authenticated agency.

For local/e2e development only, Client Hub routes also accept the seeded actor when `ENABLE_DEV_AUTH=true` and `DEV_ACTOR_EMAIL` is configured. Seed requires `DEV_ACTOR_PASSWORD` in ignored `backend/.env`. The development fallback is disabled in production and never trusts a browser-supplied agency/user id. Client create/edit requires `clients:manage`; requirement create/edit requires `requirements:manage`; confirmation requires `requirements:confirm`; communication logging requires `communications:manage`; file/reference write/removal requires `files:manage`.

For local demonstration data, run `npm run prisma:seed:dev` and then `npm run prisma:seed:demo` from `backend/`. The demo script is production-disabled and idempotent: stable fixture IDs are inserted only when absent; it does not clear or update existing rows. All records are fictional and visibly labeled `DEMO`.

## Routes

| Method | Route | Behavior |
|---|---|---|
| GET | `/health` | Liveness only; no database probe |
| POST | `/auth/signup` | Create agency workspace and first owner; sets HttpOnly session cookie |
| POST | `/auth/login` | Verify credentials; sets HttpOnly session cookie |
| POST | `/auth/logout` | Clear session cookie |
| GET | `/auth/me` | Resolve authenticated user, agency and database-backed permissions |
| GET | `/auth/google` | Return Google OAuth availability and sign-in URL |
| GET | `/auth/google/callback?code=&state=` | Verify Google callback and redirect to workspace |
| POST | `/auth/users` | Create agency member (requires `users:manage`) |
| GET | `/clients/capabilities` | Available and planned capability list |
| GET | `/client-hub/overview` | Tenant-scoped dashboard counts and recent clients, requirements needing attention, communications, files/references and safe activity summaries |
| GET | `/clients?search=&page=1&limit=20` | Active agency client list, name search, pagination |
| POST | `/clients` | Create client (name, primary contact, and at least one of email/phone/website; optional status) |
| GET | `/clients/:id` | Agency-scoped client details and recent notes |
| PATCH | `/clients/:id` | Update allowed client fields |
| GET | `/clients/:id/hub` | Client overview, requirements, and communication/file/activity counts |
| GET | `/clients/:id/requirements` | Agency-scoped requirement list |
| POST | `/clients/:id/requirements` | Create draft and structured items/references in a transaction |
| GET | `/requirements/:id` | Requirement, items, references, preparer and revision history |
| PATCH | `/requirements/:id` | Edit DRAFT or CHANGES_REQUESTED content and item order |
| PATCH | `/requirements/:id/status` | Apply one server-validated workflow transition |
| GET | `/requirements/:id/export` | JSON contract for latest confirmed version only |
| GET | `/clients/:id/communications?type=&from=&to=&page=1&limit=20` | Agency/client-scoped, filterable communication log |
| POST | `/clients/:id/communications` | Record a manual call/email/meeting/WhatsApp/video/other entry |
| GET | `/clients/:id/assets?type=&requirementId=&page=1&limit=20` | List client/requirement files and links; internal storage keys are omitted |
| POST | `/clients/:id/references` | Create an HTTP(S) external reference link |
| POST | `/clients/:id/files` | Multipart upload (`file`, optional `requirementId`, optional `label`) |
| GET | `/assets/:assetId/download` | Agency-authorized streamed file bytes; response is binary, not JSON |
| DELETE | `/assets/:assetId` | Soft-remove file/reference from active lists; retained per storage policy |
| GET | `/clients/:id/timeline?page=1&limit=25` | Descending chronological client activity with deterministic ID tie-break |

Client create/edit requires a trimmed company name (2–150 chars), primary contact (2–100; letters, marks, spaces, dots, apostrophes and hyphens), and one or more of email, phone or website. Email is validated and normalized to lowercase when supplied. A supplied phone must be a valid 7–15 digit international number; the frontend provides a country selector and posts E.164. Website accepts HTTP(S); `www.example.lk` is normalized to `https://www.example.lk`. Company names are unique per agency ignoring case and surrounding spaces. Email is deliberately not unique because multiple clients may share a team inbox. Duplicate company names return `409 DUPLICATE_CLIENT_NAME`; invalid field/contact combinations return a `400` with a stable code and human-readable message.

Example requirement create:

```json
{
  "title": "Website refresh",
  "businessObjective": "Improve qualified inbound leads",
  "requestedServices": ["UI/UX Design", "Web Development"],
  "budgetMin": "5000.00",
  "budgetMax": "8000.00",
  "currency": "USD",
  "items": [
    { "title": "Landing page", "description": "Create a responsive landing page for the service", "requirementType": "FUNCTIONAL", "itemStatus": "PENDING", "priority": "HIGH", "sortOrder": 0 },
    { "title": "Contact form", "description": "Collect customer enquiries with validation", "requirementType": "FUNCTIONAL", "itemStatus": "PENDING", "priority": "NORMAL", "sortOrder": 1 }
  ]
}
```

Confirm by PATCHing status to `UNDER_REVIEW`, then `CONFIRMED`. Confirmation requires `requirements:confirm` and stores confirmer/time plus an immutable content snapshot with a monotonic version. The export shape includes `contractVersion`, requirement/client IDs, `approvedVersion`, confirmation metadata and snapshot. Draft or unconfirmed content is never exported.

Draft fields and individual item title/descriptions may be left blank and are stored as `null`. Review/confirmation checks require a 3–150 character requirement title, 10–2,000 character business objective, at least one allowed requested service, and at least one item whose title is 3–150 characters and description 3–500 characters. Item `requirementType` is `FUNCTIONAL` or `NON_FUNCTIONAL`; `itemStatus` is `PENDING`, `CLARIFICATION` or `ACCEPTED`; priority is `LOW`, `NORMAL`, `HIGH` or `URGENT`. Optional validation covers up to 10 unique HTTP(S) reference URLs, nonnegative budget values with max ≥ min, a valid currency code when budget is entered, a positive timeline value with days/weeks/months, non-past target date, and field length limits. Invalid supplied budget, currency, timeline or date values are rejected even on draft saves. The backend enforces approval completeness even if a client bypasses UI checks. Database checks and the normalized agency/company unique index provide a second layer. They are `NOT VALID` for pre-existing rows so legacy records are not rewritten; new writes are checked.

## Proposed status policy

The five status names come from the feature specification; individual edges below are this implementation’s proposed policy:

| Current | Allowed next states |
|---|---|
| DRAFT | UNDER_REVIEW, ARCHIVED |
| UNDER_REVIEW | DRAFT, CHANGES_REQUESTED, CONFIRMED, ARCHIVED |
| CHANGES_REQUESTED | DRAFT, UNDER_REVIEW, ARCHIVED |
| CONFIRMED | CHANGES_REQUESTED, ARCHIVED |
| ARCHIVED | none |

Editing a confirmed record is rejected. Move it to `CHANGES_REQUESTED`, edit its working content, submit and confirm again; the new confirmation creates the next version while prior approved snapshots remain intact. Archiving preserves history but the current export route only serves a record whose active status is `CONFIRMED`.

## Communication example

`POST /clients/:clientId/communications`

```json
{
  "type": "MEETING",
  "subject": "Discovery session",
  "summary": "Reviewed the launch scope and key audiences.",
  "participants": ["Client contact", "Account lead"],
  "occurredAt": "2026-10-31T10:30:00.000Z",
  "followUpNotes": "Send the agreed summary.",
  "requirementId": "<same-agency-requirement-uuid>"
}
```

`occurredAt` records when the interaction happened; `createdAt` records when it was entered. Date filters are inclusive ISO timestamps. Supplying a requirement from another agency or another client returns 404.

## Files, references, and timeline

Local file storage is development-only (`backend/storage/client-hub/`, ignored by Git). Uploads are limited to PDF, JPEG, PNG and WebP, 10 MB, with MIME/extension and content-signature checks. Database records expose an authorized download route, never the filesystem path or storage key. References accept only HTTP(S) URLs and are stored without server-side fetching. Removal sets `deletedAt`; bytes remain retained until a production retention policy is selected. The local adapter returns 503 in production.

Timeline entries reuse `AuditLog` and merge existing `ClientNote` rows, link to the client and optional requirement, and store/use a dedicated `eventAt`. The API maps action codes to short descriptions and returns only event ID/type, client/requirement, actor, timestamp, description and related requirement title. It omits raw audit metadata, note body, communication summary, file metadata and external URLs. Communications use their `occurredAt` for the event timestamp; other events use the action time.

The overview endpoint uses the same backend-resolved actor as the other Client Hub routes. Every aggregation query filters by that actor's `agencyId`; the browser cannot select an agency. Recent activity descriptions are allow-listed and do not expose raw audit metadata. The frontend requests this endpoint from `/overview`; it shows loading, error and empty states based on the response.

## Login and route access limitation

`/login` is a development preview page only. It intentionally does not collect credentials or issue a session. There is no shared identity provider, password verification, JWT verifier/session cookie, or frontend route protection in this repository. Client Hub API requests currently rely on the server-configured development actor, which is disabled in production. Before production use, integrate the approved Agency OS identity provider, replace the development guard with JWT/session verification, apply route authorization, and add authentication tests. The preview button only navigates to `/overview` in a non-production build; it is not an authentication mechanism.
