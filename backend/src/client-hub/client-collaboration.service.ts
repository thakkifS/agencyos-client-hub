import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { AgencyActor } from "../common/auth/agency-context";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "../generated/prisma/client";
import { LocalAssetStorageService, type UploadBufferFile } from "./local-asset-storage.service";
import type { AssetQueryDto, CommunicationQueryDto, TimelineQueryDto } from "./dto/collaboration.dto";
import { describeClientActivity } from "./activity-description";

type CommunicationInput = { type: "CALL" | "EMAIL" | "MEETING" | "WHATSAPP_MESSAGE" | "VIDEO_MEETING" | "OTHER"; subject: string; summary: string; participants?: string[]; occurredAt: string; followUpNotes?: string; requirementId?: string };

@Injectable()
export class ClientCollaborationService {
  constructor(private readonly prisma: PrismaService, private readonly storage: LocalAssetStorageService) {}

  async communications(actor: AgencyActor, clientId: string, query: CommunicationQueryDto) {
    await this.assertClient(actor, clientId);
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    if (from && to && from > to) throw new BadRequestException({ code: "INVALID_DATE_RANGE", message: "The start date must be before the end date" });
    const where = { agencyId: actor.agencyId, clientId, ...(query.type ? { type: query.type } : {}), ...(from || to ? { occurredAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) };
    const [items, total] = await this.prisma.client.$transaction([
      this.prisma.client.clientCommunication.findMany({ where, orderBy: [{ occurredAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.limit, take: query.limit, include: { createdBy: { select: { id: true, name: true } }, requirement: { select: { id: true, title: true } } } }),
      this.prisma.client.clientCommunication.count({ where }),
    ]);
    return { items, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
  }

  async createCommunication(actor: AgencyActor, clientId: string, input: CommunicationInput) {
    this.requirePermission(actor, "communications:manage");
    await this.assertClient(actor, clientId);
    if (input.requirementId) await this.assertRequirement(actor, clientId, input.requirementId);
    const occurredAt = new Date(input.occurredAt);
    return this.prisma.client.$transaction(async (tx) => {
      const record = await tx.clientCommunication.create({ data: { ...input, agencyId: actor.agencyId, clientId, createdById: actor.userId, occurredAt, participants: input.participants ?? [] }, include: { createdBy: { select: { id: true, name: true } }, requirement: { select: { id: true, title: true } } } });
      await tx.auditLog.create({ data: { agencyId: actor.agencyId, clientId, requirementId: input.requirementId, actorId: actor.userId, action: "COMMUNICATION_RECORDED", entityType: "ClientCommunication", entityId: record.id, eventAt: occurredAt, metadata: { communicationType: input.type } } });
      return record;
    });
  }

  async assets(actor: AgencyActor, clientId: string, query: AssetQueryDto) {
    await this.assertClient(actor, clientId);
    if (query.requirementId) await this.assertRequirement(actor, clientId, query.requirementId);
    const where = { agencyId: actor.agencyId, clientId, deletedAt: null, ...(query.requirementId ? { requirementId: query.requirementId } : {}), ...(query.type ? { type: query.type } : {}) };
    const [items, total] = await this.prisma.client.$transaction([
      this.prisma.client.clientAsset.findMany({ where, orderBy: [{ uploadedAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.limit, take: query.limit, include: { uploadedBy: { select: { id: true, name: true } }, requirement: { select: { id: true, title: true } } } }),
      this.prisma.client.clientAsset.count({ where }),
    ]);
    return { items: items.map((item) => this.publicAsset(item)), pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
  }

  async createReference(actor: AgencyActor, clientId: string, input: { label: string; url: string; requirementId?: string }) {
    this.requirePermission(actor, "files:manage");
    await this.assertClient(actor, clientId);
    if (input.requirementId) await this.assertRequirement(actor, clientId, input.requirementId);
    const now = new Date();
    return this.prisma.client.$transaction(async (tx) => {
      const asset = await tx.clientAsset.create({ data: { agencyId: actor.agencyId, clientId, requirementId: input.requirementId, type: "REFERENCE", label: input.label, externalUrl: input.url, uploadedById: actor.userId }, include: { uploadedBy: { select: { id: true, name: true } }, requirement: { select: { id: true, title: true } } } });
      await tx.auditLog.create({ data: { agencyId: actor.agencyId, clientId, requirementId: input.requirementId, actorId: actor.userId, action: "REFERENCE_ADDED", entityType: "ClientAsset", entityId: asset.id, eventAt: now, metadata: { assetType: "REFERENCE" } } });
      return this.publicAsset(asset);
    });
  }

  async upload(actor: AgencyActor, clientId: string, file: UploadBufferFile, input: { requirementId?: string; label?: string }) {
    this.requirePermission(actor, "files:manage");
    await this.assertClient(actor, clientId);
    if (input.requirementId) await this.assertRequirement(actor, clientId, input.requirementId);
    const info = this.storage.validate(file);
    const storageKey = await this.storage.save(file.buffer, info.extension);
    const now = new Date();
    try {
      const asset = await this.prisma.client.$transaction(async (tx) => {
        const record = await tx.clientAsset.create({ data: { agencyId: actor.agencyId, clientId, requirementId: input.requirementId, type: "FILE", originalName: info.originalName, mimeType: info.mimeType, fileSize: info.fileSize, storageKey, label: input.label?.trim() || info.originalName, uploadedById: actor.userId }, include: { uploadedBy: { select: { id: true, name: true } }, requirement: { select: { id: true, title: true } } } });
        await tx.auditLog.create({ data: { agencyId: actor.agencyId, clientId, requirementId: input.requirementId, actorId: actor.userId, action: "FILE_ADDED", entityType: "ClientAsset", entityId: record.id, eventAt: now, metadata: { assetType: "FILE" } } });
        return record;
      });
      return this.publicAsset(asset);
    } catch (error) {
      await this.storage.discard(storageKey);
      throw error;
    }
  }

  async download(actor: AgencyActor, assetId: string) {
    const asset = await this.prisma.client.clientAsset.findFirst({ where: { id: assetId, agencyId: actor.agencyId, type: "FILE", deletedAt: null }, select: { storageKey: true, originalName: true, mimeType: true, fileSize: true } });
    if (!asset?.storageKey || !asset.originalName || !asset.mimeType) throw new NotFoundException({ code: "FILE_NOT_FOUND", message: "File not found" });
    return { path: await this.storage.pathForDownload(asset.storageKey), filename: asset.originalName, mimeType: asset.mimeType, size: asset.fileSize };
  }

  async removeAsset(actor: AgencyActor, assetId: string) {
    this.requirePermission(actor, "files:manage");
    const asset = await this.prisma.client.clientAsset.findFirst({ where: { id: assetId, agencyId: actor.agencyId, deletedAt: null }, select: { id: true, clientId: true, requirementId: true, type: true } });
    if (!asset) throw new NotFoundException({ code: "ASSET_NOT_FOUND", message: "File or reference not found" });
    const deletedAt = new Date();
    await this.prisma.client.$transaction(async (tx) => {
      await tx.clientAsset.update({ where: { id: asset.id }, data: { deletedAt } });
      await tx.auditLog.create({ data: { agencyId: actor.agencyId, clientId: asset.clientId, requirementId: asset.requirementId, actorId: actor.userId, action: asset.type === "FILE" ? "FILE_REMOVED" : "REFERENCE_REMOVED", entityType: "ClientAsset", entityId: asset.id, eventAt: deletedAt, metadata: { assetType: asset.type } } });
    });
    return { id: asset.id, removedAt: deletedAt };
  }

  async timeline(actor: AgencyActor, clientId: string, query: TimelineQueryDto) {
    await this.assertClient(actor, clientId);
    type TimelineRow = { id: string; eventType: string; clientId: string; requirementId: string | null; actorId: string | null; actorName: string | null; occurredAt: Date; relatedRequirementTitle: string | null; metadata: unknown };
    const skip = (query.page - 1) * query.limit;
    const [events, auditCount, noteCount] = await Promise.all([
      this.prisma.client.$queryRaw<TimelineRow[]>(Prisma.sql`
        SELECT event."id", event."eventType", event."clientId", event."requirementId", event."actorId",
               actor."name" AS "actorName", event."occurredAt", requirement."title" AS "relatedRequirementTitle", event."metadata"
        FROM (
          SELECT 'audit:' || log."id"::TEXT AS "id", log."action" AS "eventType", log."agencyId", log."clientId", log."requirementId", log."actorId", log."eventAt" AS "occurredAt", log."metadata"
          FROM "AuditLog" AS log WHERE log."agencyId" = ${actor.agencyId}::UUID AND log."clientId" = ${clientId}::UUID
          UNION ALL
          SELECT 'note:' || note."id"::TEXT AS "id", 'CLIENT_NOTE_ADDED' AS "eventType", note."agencyId", note."clientId", NULL::UUID AS "requirementId", note."authorId" AS "actorId", note."createdAt" AT TIME ZONE 'UTC' AS "occurredAt", NULL::JSONB AS "metadata"
          FROM "ClientNote" AS note WHERE note."agencyId" = ${actor.agencyId}::UUID AND note."clientId" = ${clientId}::UUID
        ) AS event
        LEFT JOIN "User" AS actor ON actor."agencyId" = event."agencyId" AND actor."id" = event."actorId"
        LEFT JOIN "ClientRequirement" AS requirement ON requirement."agencyId" = event."agencyId" AND requirement."clientId" = event."clientId" AND requirement."id" = event."requirementId"
        ORDER BY event."occurredAt" DESC, event."id" DESC
        LIMIT ${query.limit} OFFSET ${skip}
      `),
      this.prisma.client.auditLog.count({ where: { agencyId: actor.agencyId, clientId } }),
      this.prisma.client.clientNote.count({ where: { agencyId: actor.agencyId, clientId } }),
    ]);
    const total = auditCount + noteCount;
    return { items: events.map((event) => ({ id: event.id, eventType: event.eventType, clientId: event.clientId, requirementId: event.requirementId, actor: event.actorId && event.actorName ? { id: event.actorId, name: event.actorName } : null, occurredAt: event.occurredAt, description: event.eventType === "CLIENT_NOTE_ADDED" ? "Client note added" : describeClientActivity(event.eventType, event.metadata), relatedRequirementTitle: event.relatedRequirementTitle })), pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
  }

  private publicAsset(asset: { id: string; clientId: string; requirementId: string | null; type: "FILE" | "REFERENCE"; originalName: string | null; mimeType: string | null; fileSize: number | null; externalUrl: string | null; label: string; uploadedAt: Date; uploadedBy: { id: string; name: string }; requirement: { id: string; title: string | null } | null }) {
    return { id: asset.id, clientId: asset.clientId, requirementId: asset.requirementId, type: asset.type, originalName: asset.originalName, mimeType: asset.mimeType, fileSize: asset.fileSize, externalUrl: asset.externalUrl, label: asset.label, uploadedAt: asset.uploadedAt, uploadedBy: asset.uploadedBy, requirement: asset.requirement, downloadUrl: asset.type === "FILE" ? `/api/assets/${asset.id}/download` : null };
  }
  private requirePermission(actor: AgencyActor, permission: string) { if (!actor.permissions.includes(permission)) throw new ForbiddenException({ code: "PERMISSION_DENIED", message: `Required permission ${permission} is missing` }); }
  private async assertClient(actor: AgencyActor, clientId: string) { const exists = await this.prisma.client.client.findFirst({ where: { id: clientId, agencyId: actor.agencyId }, select: { id: true } }); if (!exists) throw new NotFoundException({ code: "CLIENT_NOT_FOUND", message: "Client not found" }); }
  private async assertRequirement(actor: AgencyActor, clientId: string, requirementId: string) { const exists = await this.prisma.client.clientRequirement.findFirst({ where: { id: requirementId, agencyId: actor.agencyId, clientId }, select: { id: true } }); if (!exists) throw new NotFoundException({ code: "REQUIREMENT_NOT_FOUND", message: "Requirement not found for this client" }); }
}
