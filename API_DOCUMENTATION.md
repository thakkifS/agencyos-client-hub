# API documentation

Base URL: `http://localhost:5000/api`. All routes use the standard success envelope `{ "success": true, "data": ..., "message": "Operation completed successfully" }`. Errors are `{ "success": false, "message": "...", "code": "...", "details": {} }`. List responses include `{ items, pagination: { page, limit, total, pages } }`.

## Local development identity

Client Hub routes currently use a development-only actor resolved from the seeded local user and its agency/role. Enable only in ignored `backend/.env` with `ENABLE_DEV_AUTH=true` and `DEV_ACTOR_EMAIL=...`; seed using `npm run prisma:seed:dev`. Client create/edit requires `clients:manage`; requirement create/edit requires `requirements:manage`; confirmation requires `requirements:confirm`. The guard is disabled in production and never trusts a browser-supplied agency/user id. Replace it with the shared Agency OS JWT verifier before deployment.

## Routes

| Method | Route | Behavior |
|---|---|---|
| GET | `/health` | Liveness only; no database probe |
| GET | `/clients/capabilities` | Available and planned capability list |
| GET | `/clients?search=&page=1&limit=20` | Active agency client list, name search, pagination |
| POST | `/clients` | Create client (`name`; optional contact, email, phone, website, status) |
| GET | `/clients/:id` | Agency-scoped client details and recent notes |
| PATCH | `/clients/:id` | Update allowed client fields |
| GET | `/clients/:id/hub` | Client overview, requirements and prepared empty-section contracts |
| GET | `/clients/:id/requirements` | Agency-scoped requirement list |
| POST | `/clients/:id/requirements` | Create draft and structured items/references in a transaction |
| GET | `/requirements/:id` | Requirement, items, references, preparer and revision history |
| PATCH | `/requirements/:id` | Edit DRAFT or CHANGES_REQUESTED content and item order |
| PATCH | `/requirements/:id/status` | Apply one server-validated workflow transition |
| GET | `/requirements/:id/export` | JSON contract for latest confirmed version only |

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
