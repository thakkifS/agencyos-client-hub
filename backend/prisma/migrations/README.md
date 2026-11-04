## Migration history

- `20261031185016_client_hub`: initial standalone canonical foundation and Client Hub requirement tables.
- `20261101000000_communication_files_timeline`: agency-scoped communication/assets plus client/requirement audit links; backfills prior requirement audit associations.
- `20261101001000_audit_event_timestamp`: adds `AuditLog.eventAt`, backfills existing events from their original `createdAt`, and adds the timeline ordering index.
- `20261104120000_client_and_requirement_validation`: adds structured requirement item enums, allows incomplete draft text, applies client/contact size and format checks, adds normalized per-agency company-name uniqueness, and constrains requirement budgets/currency syntax/text sizes. Checks use `NOT VALID` so existing records are retained; PostgreSQL applies them to new or updated rows.

The local PostgreSQL 18.6 target (`agency_os_db`, port 5433) was verified before applying the migrations. The Task 04 and Task 05 migrations are additive. The latest validation migration has been applied locally. No reset/drop command was used. For another local database, configure ignored `backend/.env`, inspect `npx prisma migrate status`, then apply tracked migrations with `npx prisma migrate deploy`.
