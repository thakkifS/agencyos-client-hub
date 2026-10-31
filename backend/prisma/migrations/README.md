## Migration history

- `20261031185016_client_hub`: initial standalone canonical foundation and Client Hub requirement tables.
- `20261101000000_communication_files_timeline`: agency-scoped communication/assets plus client/requirement audit links; backfills prior requirement audit associations.
- `20261101001000_audit_event_timestamp`: adds `AuditLog.eventAt`, backfills existing events from their original `createdAt`, and adds the timeline ordering index.

The local PostgreSQL 18.6 target (`agency_os_db`, port 5433) was verified before applying the migrations. Both Task 04 migrations are additive. No reset/drop command was used. For another local database, configure ignored `backend/.env`, inspect `npx prisma migrate status`, then apply tracked migrations with `npx prisma migrate deploy`.
