## Migration history

- `20261031185016_client_hub`: initial standalone canonical foundation and Client Hub requirement tables.
- `20261101000000_communication_files_timeline`: agency-scoped communication/assets plus client/requirement audit links; backfills prior requirement audit associations.
- `20261101001000_audit_event_timestamp`: adds `AuditLog.eventAt`, backfills existing events from their original `createdAt`, and adds the timeline ordering index.
- `20261104120000_client_and_requirement_validation`: adds structured requirement item enums, allows incomplete draft text, applies client/contact size and format checks, adds normalized per-agency company-name uniqueness, and constrains requirement budgets/currency syntax/text sizes. Checks use `NOT VALID` so existing records are retained; PostgreSQL applies them to new or updated rows.
- `20261105150000_user_authentication`: adds additive user authentication and identity fields (`passwordHash`, `googleId`, `avatarUrl`, `isActive`, `lastLoginAt`) and lookup indexes. Existing users and agencies remain intact without table drop or schema reset.

The local PostgreSQL 18.6 target (`agency_os_db`, port 5433) was verified before applying the migrations. The Task 04 and Task 05 migrations are additive. The latest validation migration has been applied locally. No reset/drop command was used. Run Prisma commands from `backend/`, whose package pins Prisma 7: inspect with `npm run prisma:status`, then apply tracked migrations with `npm run prisma:deploy`.
