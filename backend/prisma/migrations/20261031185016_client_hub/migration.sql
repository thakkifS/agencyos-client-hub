-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('LEAD', 'ONBOARDING', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "RequirementStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'CONFIRMED', 'CHANGES_REQUESTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RequirementPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "Agency" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "roleId" UUID,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "primaryContactName" TEXT,
    "primaryEmail" TEXT,
    "primaryPhone" TEXT,
    "website" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'LEAD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientNote" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientRequirement" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "businessObjective" TEXT NOT NULL,
    "requestedServices" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "designPreferences" TEXT,
    "referenceLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "budgetMin" DECIMAL(12,2),
    "budgetMax" DECIMAL(12,2),
    "currency" VARCHAR(3),
    "expectedTimeline" VARCHAR(200),
    "targetDate" TIMESTAMPTZ(3),
    "constraints" TEXT,
    "assumptions" TEXT,
    "additionalNotes" TEXT,
    "preparedById" UUID NOT NULL,
    "confirmedById" UUID,
    "confirmedAt" TIMESTAMPTZ(3),
    "status" "RequirementStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementItem" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "requirementId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(100),
    "priority" "RequirementPriority" NOT NULL DEFAULT 'NORMAL',
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequirementItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementReference" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "requirementId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementRevision" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "requirementId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "contentSnapshot" JSONB NOT NULL,
    "changeReason" TEXT,
    "confirmedById" UUID NOT NULL,
    "confirmedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "budget" DECIMAL(12,2),
    "currency" VARCHAR(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "projectId" UUID,
    "title" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PermissionToRole" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_PermissionToRole_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "User_agencyId_idx" ON "User"("agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "User_agencyId_id_key" ON "User"("agencyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "User_agencyId_email_key" ON "User"("agencyId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_agencyId_name_key" ON "Role"("agencyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Role_agencyId_id_key" ON "Role"("agencyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "Client_agencyId_status_idx" ON "Client"("agencyId", "status");

-- CreateIndex
CREATE INDEX "Client_agencyId_name_idx" ON "Client"("agencyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Client_agencyId_id_key" ON "Client"("agencyId", "id");

-- CreateIndex
CREATE INDEX "ClientNote_agencyId_clientId_createdAt_idx" ON "ClientNote"("agencyId", "clientId", "createdAt");

-- CreateIndex
CREATE INDEX "ClientRequirement_agencyId_clientId_status_updatedAt_idx" ON "ClientRequirement"("agencyId", "clientId", "status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClientRequirement_agencyId_id_key" ON "ClientRequirement"("agencyId", "id");

-- CreateIndex
CREATE INDEX "RequirementItem_agencyId_requirementId_sortOrder_idx" ON "RequirementItem"("agencyId", "requirementId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementItem_requirementId_sortOrder_key" ON "RequirementItem"("requirementId", "sortOrder");

-- CreateIndex
CREATE INDEX "RequirementReference_agencyId_requirementId_idx" ON "RequirementReference"("agencyId", "requirementId");

-- CreateIndex
CREATE INDEX "RequirementRevision_agencyId_requirementId_version_idx" ON "RequirementRevision"("agencyId", "requirementId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementRevision_requirementId_version_key" ON "RequirementRevision"("requirementId", "version");

-- CreateIndex
CREATE INDEX "Project_agencyId_clientId_idx" ON "Project"("agencyId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_agencyId_id_key" ON "Project"("agencyId", "id");

-- CreateIndex
CREATE INDEX "Task_agencyId_status_idx" ON "Task"("agencyId", "status");

-- CreateIndex
CREATE INDEX "Notification_agencyId_userId_readAt_idx" ON "Notification"("agencyId", "userId", "readAt");

-- CreateIndex
CREATE INDEX "AuditLog_agencyId_createdAt_idx" ON "AuditLog"("agencyId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_agencyId_entityType_entityId_idx" ON "AuditLog"("agencyId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "_PermissionToRole_B_index" ON "_PermissionToRole"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_agencyId_roleId_fkey" FOREIGN KEY ("agencyId", "roleId") REFERENCES "Role"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_agencyId_clientId_fkey" FOREIGN KEY ("agencyId", "clientId") REFERENCES "Client"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_agencyId_authorId_fkey" FOREIGN KEY ("agencyId", "authorId") REFERENCES "User"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientRequirement" ADD CONSTRAINT "ClientRequirement_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientRequirement" ADD CONSTRAINT "ClientRequirement_agencyId_clientId_fkey" FOREIGN KEY ("agencyId", "clientId") REFERENCES "Client"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientRequirement" ADD CONSTRAINT "ClientRequirement_agencyId_preparedById_fkey" FOREIGN KEY ("agencyId", "preparedById") REFERENCES "User"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientRequirement" ADD CONSTRAINT "ClientRequirement_agencyId_confirmedById_fkey" FOREIGN KEY ("agencyId", "confirmedById") REFERENCES "User"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementItem" ADD CONSTRAINT "RequirementItem_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementItem" ADD CONSTRAINT "RequirementItem_agencyId_requirementId_fkey" FOREIGN KEY ("agencyId", "requirementId") REFERENCES "ClientRequirement"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementReference" ADD CONSTRAINT "RequirementReference_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementReference" ADD CONSTRAINT "RequirementReference_agencyId_requirementId_fkey" FOREIGN KEY ("agencyId", "requirementId") REFERENCES "ClientRequirement"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementReference" ADD CONSTRAINT "RequirementReference_agencyId_createdById_fkey" FOREIGN KEY ("agencyId", "createdById") REFERENCES "User"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementRevision" ADD CONSTRAINT "RequirementRevision_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementRevision" ADD CONSTRAINT "RequirementRevision_agencyId_requirementId_fkey" FOREIGN KEY ("agencyId", "requirementId") REFERENCES "ClientRequirement"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementRevision" ADD CONSTRAINT "RequirementRevision_agencyId_confirmedById_fkey" FOREIGN KEY ("agencyId", "confirmedById") REFERENCES "User"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_agencyId_clientId_fkey" FOREIGN KEY ("agencyId", "clientId") REFERENCES "Client"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_agencyId_projectId_fkey" FOREIGN KEY ("agencyId", "projectId") REFERENCES "Project"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_agencyId_userId_fkey" FOREIGN KEY ("agencyId", "userId") REFERENCES "User"("agencyId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_agencyId_actorId_fkey" FOREIGN KEY ("agencyId", "actorId") REFERENCES "User"("agencyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
