-- Add a sortable event timestamp while preserving the original audit creation time.
ALTER TABLE "AuditLog" ADD COLUMN "eventAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "AuditLog" SET "eventAt" = "createdAt";
CREATE INDEX "AuditLog_agencyId_clientId_eventAt_id_idx" ON "AuditLog"("agencyId", "clientId", "eventAt", "id");
