-- Additive Task 04 schema changes. Existing client/requirement records are preserved.
CREATE TYPE "CommunicationType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'WHATSAPP_MESSAGE', 'VIDEO_MEETING', 'OTHER');
CREATE TYPE "ClientAssetType" AS ENUM ('FILE', 'REFERENCE');

ALTER TABLE "AuditLog" ADD COLUMN "clientId" UUID, ADD COLUMN "requirementId" UUID;

CREATE TABLE "ClientCommunication" (
  "id" UUID NOT NULL,
  "agencyId" UUID NOT NULL,
  "clientId" UUID NOT NULL,
  "requirementId" UUID,
  "type" "CommunicationType" NOT NULL,
  "subject" VARCHAR(200) NOT NULL,
  "summary" TEXT NOT NULL,
  "participants" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "occurredAt" TIMESTAMPTZ(3) NOT NULL,
  "followUpNotes" TEXT,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientCommunication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientAsset" (
  "id" UUID NOT NULL,
  "agencyId" UUID NOT NULL,
  "clientId" UUID NOT NULL,
  "requirementId" UUID,
  "type" "ClientAssetType" NOT NULL,
  "originalName" VARCHAR(255),
  "mimeType" VARCHAR(100),
  "fileSize" INTEGER,
  "storageKey" VARCHAR(100),
  "externalUrl" VARCHAR(2048),
  "label" VARCHAR(200) NOT NULL,
  "uploadedById" UUID NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "ClientAsset_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClientAsset_type_metadata_check" CHECK (
    ("type" = 'FILE' AND "storageKey" IS NOT NULL AND "externalUrl" IS NULL AND "originalName" IS NOT NULL AND "mimeType" IS NOT NULL AND "fileSize" BETWEEN 1 AND 10485760)
    OR
    ("type" = 'REFERENCE' AND "externalUrl" IS NOT NULL AND "storageKey" IS NULL AND "originalName" IS NULL AND "mimeType" IS NULL AND "fileSize" IS NULL)
  )
);

CREATE INDEX "ClientCommunication_agencyId_clientId_occurredAt_id_idx" ON "ClientCommunication"("agencyId", "clientId", "occurredAt", "id");
CREATE INDEX "ClientCommunication_agencyId_type_occurredAt_idx" ON "ClientCommunication"("agencyId", "type", "occurredAt");
CREATE UNIQUE INDEX "ClientAsset_storageKey_key" ON "ClientAsset"("storageKey");
CREATE INDEX "ClientAsset_agencyId_clientId_uploadedAt_id_idx" ON "ClientAsset"("agencyId", "clientId", "uploadedAt", "id");
CREATE INDEX "ClientAsset_agencyId_requirementId_idx" ON "ClientAsset"("agencyId", "requirementId");
CREATE UNIQUE INDEX "ClientRequirement_agencyId_clientId_id_key" ON "ClientRequirement"("agencyId", "clientId", "id");
CREATE INDEX "AuditLog_agencyId_clientId_createdAt_id_idx" ON "AuditLog"("agencyId", "clientId", "createdAt", "id");

-- Associate previously-recorded requirement events with their client for timeline reads.
UPDATE "AuditLog" AS log
SET "clientId" = requirement."clientId", "requirementId" = requirement."id"
FROM "ClientRequirement" AS requirement
WHERE log."entityType" = 'ClientRequirement'
  AND log."entityId" = requirement."id"::TEXT
  AND log."clientId" IS NULL;

ALTER TABLE "ClientCommunication" ADD CONSTRAINT "ClientCommunication_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientCommunication" ADD CONSTRAINT "ClientCommunication_agencyId_clientId_fkey" FOREIGN KEY ("agencyId", "clientId") REFERENCES "Client"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientCommunication" ADD CONSTRAINT "ClientCommunication_agencyId_clientId_requirementId_fkey" FOREIGN KEY ("agencyId", "clientId", "requirementId") REFERENCES "ClientRequirement"("agencyId", "clientId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientCommunication" ADD CONSTRAINT "ClientCommunication_agencyId_createdById_fkey" FOREIGN KEY ("agencyId", "createdById") REFERENCES "User"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientAsset" ADD CONSTRAINT "ClientAsset_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientAsset" ADD CONSTRAINT "ClientAsset_agencyId_clientId_fkey" FOREIGN KEY ("agencyId", "clientId") REFERENCES "Client"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientAsset" ADD CONSTRAINT "ClientAsset_agencyId_clientId_requirementId_fkey" FOREIGN KEY ("agencyId", "clientId", "requirementId") REFERENCES "ClientRequirement"("agencyId", "clientId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientAsset" ADD CONSTRAINT "ClientAsset_agencyId_uploadedById_fkey" FOREIGN KEY ("agencyId", "uploadedById") REFERENCES "User"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_agencyId_clientId_fkey" FOREIGN KEY ("agencyId", "clientId") REFERENCES "Client"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_agencyId_clientId_requirementId_fkey" FOREIGN KEY ("agencyId", "clientId", "requirementId") REFERENCES "ClientRequirement"("agencyId", "clientId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
