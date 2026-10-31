# API documentation

Base URL: `http://localhost:5000/api`

All current successful responses use `{ "success": true, "data": ..., "message": "Operation completed successfully" }`. Errors use `{ "success": false, "message": "...", "code": "...", "details": {} }`. Validation errors return HTTP 400 with stable code `VALIDATION_ERROR`.

## `GET /health`

Operational liveness check. It does not query PostgreSQL.

```json
{
  "success": true,
  "data": { "status": "ok", "timestamp": "2026-10-31T00:00:00.000Z", "service": "agencyos-api" },
  "message": "Operation completed successfully"
}
```

## `GET /clients/capabilities`

Foundation status endpoint. It reports planned workflows; it does not return client data.

## Not implemented yet

Client CRUD, authentication/JWT endpoints, permission-protected business routes, requirements, communication logs, file links and confirmed-requirement export. Do not send an `agencyId` from the browser as an authorization claim. Future route handlers must derive tenant context from the authenticated actor and validate ownership.
