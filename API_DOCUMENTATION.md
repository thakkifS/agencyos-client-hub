# API documentation

Base URL: `http://localhost:5000/api`. All routes use the standard success envelope `{ "success": true, "data": ..., "message": "Operation completed successfully" }`. Errors are `{ "success": false, "message": "...", "code": "...", "details": {} }`. List responses include `{ items, pagination: { page, limit, total, pages } }`.

## Local development identity

Client Hub routes currently use a development-only actor resolved from the seeded local user and its agency/role. Enable only in ignored `backend/.env` with `ENABLE_DEV_AUTH=true` and `DEV_ACTOR_EMAIL=...`; seed using `npm run prisma:seed:dev`. Client create/edit requires `clients:manage`; requirement create/edit requires `requirements:manage`; confirmation requires `requirements:confirm`; communication logging requires `communications:manage`; file/reference write/removal requires `files:manage`. The guard is disabled in production and never trusts a browser-supplied agency/user id. Replace it with the shared Agency OS JWT verifier before deployment.

## Routes

| Method | Route | Behavior |
|---|---|---|
| GET | `/health` | Liveness only; no database probe |
| GET | `/clients/capabilities` | Available and planned capability list |
| GET | `/clients?search=&page=1&limit=20` | Active agency client list, name search, pagination |
| POST | `/clients` | Create client (`name`; optional contact, email, phone, website, status) |
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

Example requirement create:

```json
{
  "title": "Website refresh",
  "businessObjective": "Improve qualified inbound leads",
  "requestedServices": ["Design", "Development"],
  "budgetMin": "5000.00",
  "budgetMax": "8000.00",
  "currency": "USD",
  "items": [
    { "title": "Landing page", "priority": "HIGH", "sortOrder": 0 },
    { "title": "Contact form", "priority": "NORMAL", "sortOrder": 1 }
  ]
}
```

Confirm by PATCHing status to `UNDER_REVIEW`, then `CONFIRMED`. Confirmation requires `requirements:confirm` and stores confirmer/time plus an immutable content snapshot with a monotonic version. The export shape includes `contractVersion`, requirement/client IDs, `approvedVersion`, confirmation metadata and snapshot. Draft or unconfirmed content is never exported.

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
