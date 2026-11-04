import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "../generated/prisma/client";
import { isValidPhoneNumber, parsePhoneNumberFromString } from "libphonenumber-js/max";
import { isEmail } from "class-validator";
import { requirementTypes, requestedServiceOptions } from "./dto/client-hub.dto";
import { describeClientActivity } from "./activity-description";
import type { AgencyActor } from "../common/auth/agency-context";
import { PrismaService } from "../prisma/prisma.service";

const requirementInclude = { items: { orderBy: { sortOrder: "asc" as const } }, references: true, revisions: { orderBy: { version: "desc" as const }, include: { confirmedBy: { select: { id: true, name: true } } } }, preparedBy: { select: { id: true, name: true } }, confirmedBy: { select: { id: true, name: true } } };
const DEVELOPMENT_AGENCY_ID = "a8b9a002-4f48-44b3-9b22-289b2f2f1a01";
type RequirementInput = { title?: string | null; businessObjective?: string | null; requestedServices?: string[]; designPreferences?: string | null; referenceLinks?: string[]; budgetMin?: string | number | null; budgetMax?: string | number | null; currency?: string | null; expectedTimeline?: string | null; targetDate?: string | null; constraints?: string | null; assumptions?: string | null; additionalNotes?: string | null; items?: Array<{ id?: string; title?: string | null; description?: string | null; category?: string | null; requirementType?: "FUNCTIONAL" | "NON_FUNCTIONAL"; itemStatus?: "PENDING" | "CLARIFICATION" | "ACCEPTED"; priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT"; notes?: string | null; sortOrder: number }>; changeReason?: string };

@Injectable()
export class ClientHubService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}
  capabilities() { return { implemented: ["health-check", "client-management", "requirement-workflow", "confirmed-requirement-export", "communications", "files-and-references", "client-activity-timeline"], planned: [] }; }

  async overview(actor: AgencyActor) {
    const agencyId = actor.agencyId;
    const [totalClients, requirementCounts, recentClients, requirementsNeedingAttention, recentCommunications, recentFiles, auditRows, noteRows] = await Promise.all([
      this.prisma.client.client.count({ where: { agencyId } }),
      this.prisma.client.clientRequirement.groupBy({ by: ["status"], where: { agencyId }, _count: { _all: true } }),
      this.prisma.client.client.findMany({ where: { agencyId }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 5, select: { id: true, name: true, status: true, updatedAt: true, _count: { select: { requirements: true } } } }),
      this.prisma.client.clientRequirement.findMany({ where: { agencyId, status: { in: ["UNDER_REVIEW", "CHANGES_REQUESTED"] } }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 6, select: { id: true, clientId: true, title: true, status: true, updatedAt: true, client: { select: { id: true, name: true } }, preparedBy: { select: { id: true, name: true } } } }),
      this.prisma.client.clientCommunication.findMany({ where: { agencyId }, orderBy: [{ occurredAt: "desc" }, { id: "desc" }], take: 5, select: { id: true, clientId: true, requirementId: true, type: true, subject: true, occurredAt: true, client: { select: { id: true, name: true } }, requirement: { select: { id: true, title: true } } } }),
      this.prisma.client.clientAsset.findMany({ where: { agencyId, deletedAt: null }, orderBy: [{ uploadedAt: "desc" }, { id: "desc" }], take: 5, select: { id: true, clientId: true, requirementId: true, type: true, label: true, originalName: true, externalUrl: true, uploadedAt: true, client: { select: { id: true, name: true } } } }),
      this.prisma.client.auditLog.findMany({ where: { agencyId, clientId: { not: null } }, orderBy: [{ eventAt: "desc" }, { id: "desc" }], take: 8, select: { id: true, action: true, clientId: true, requirementId: true, eventAt: true, metadata: true, actor: { select: { id: true, name: true } }, client: { select: { id: true, name: true } }, requirement: { select: { title: true } } } }),
      this.prisma.client.clientNote.findMany({ where: { agencyId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 8, select: { id: true, clientId: true, createdAt: true, author: { select: { id: true, name: true } }, client: { select: { id: true, name: true } } } }),
    ]);
    const counts = new Map(requirementCounts.map((row) => [row.status, row._count._all]));
    const recentActivity = [
      ...auditRows.map((row) => ({ id: `audit:${row.id}`, eventType: row.action, clientId: row.clientId!, clientName: row.client?.name ?? "Client", requirementId: row.requirementId, requirementTitle: row.requirement?.title ?? null, actor: row.actor, occurredAt: row.eventAt, description: describeClientActivity(row.action, row.metadata) })),
      ...noteRows.map((row) => ({ id: `note:${row.id}`, eventType: "CLIENT_NOTE_ADDED", clientId: row.clientId, clientName: row.client.name, requirementId: null, requirementTitle: null, actor: row.author, occurredAt: row.createdAt, description: "Client note added" })),
    ].sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime() || right.id.localeCompare(left.id)).slice(0, 6);
    return {
      metrics: { totalClients, draftRequirements: counts.get("DRAFT") ?? 0, underReviewRequirements: counts.get("UNDER_REVIEW") ?? 0, confirmedRequirements: counts.get("CONFIRMED") ?? 0 },
      recentClients,
      requirementsNeedingAttention,
      recentCommunications,
      recentFiles,
      recentActivity,
    };
  }

  async actorForDevelopment() {
    if (this.config.get("NODE_ENV") === "production" || this.config.get("ENABLE_DEV_AUTH") !== "true") throw new ForbiddenException("Development authentication is disabled");
    const email = this.config.get<string>("DEV_ACTOR_EMAIL");
    if (!email) throw new ForbiddenException("Configure DEV_ACTOR_EMAIL for local development");
    const user = await this.prisma.client.user.findFirst({ where: { agencyId: DEVELOPMENT_AGENCY_ID, email }, include: { role: { include: { permissions: true } } } });
    if (!user) throw new ForbiddenException("Configured development actor does not exist");
    return { userId: user.id, agencyId: user.agencyId, permissions: user.role?.permissions.map((permission) => permission.key) ?? [] };
  }

  async listClients(actor: AgencyActor, query: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query.page ?? 1), limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const where: Prisma.ClientWhereInput = { agencyId: actor.agencyId, ...(query.search ? { name: { contains: query.search.trim(), mode: "insensitive" } } : {}) };
    const [items, total] = await this.prisma.client.$transaction([this.prisma.client.client.findMany({ where, orderBy: { name: "asc" }, skip: (page - 1) * limit, take: limit, include: { _count: { select: { requirements: true, projects: true } } } }), this.prisma.client.client.count({ where })]);
    return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }
  async createClient(actor: AgencyActor, input: { name: string; primaryContactName: string; primaryEmail?: string | null; primaryPhone?: string | null; website?: string | null; status?: "LEAD" | "ONBOARDING" | "ACTIVE" | "PAUSED" | "ARCHIVED" }) {
    this.assertPermission(actor, "clients:manage");
    const data = this.normalizeClientInput(input);
    await this.assertUniqueClientName(actor, data.name);
    try {
      return await this.prisma.client.$transaction(async (tx) => {
        const client = await tx.client.create({ data: { ...data, agencyId: actor.agencyId } });
        await tx.auditLog.create({ data: { agencyId: actor.agencyId, clientId: client.id, actorId: actor.userId, action: "CLIENT_CREATED", entityType: "Client", entityId: client.id, metadata: { fields: Object.keys(data) } } });
        return client;
      });
    } catch (error) { this.rethrowDuplicateClient(error); }
  }
  async client(actor: AgencyActor, id: string) { const row = await this.prisma.client.client.findFirst({ where: { id, agencyId: actor.agencyId }, include: { notes: { orderBy: { createdAt: "desc" }, take: 10, include: { author: { select: { id: true, name: true } } } }, _count: { select: { requirements: true, projects: true } } } }); if (!row) throw new NotFoundException({ code: "CLIENT_NOT_FOUND", message: "Client not found" }); return row; }
  async updateClient(actor: AgencyActor, id: string, input: Record<string, unknown>) {
    this.assertPermission(actor, "clients:manage");
    const current = await this.prisma.client.client.findFirst({ where: { id, agencyId: actor.agencyId } });
    if (!current) throw new NotFoundException({ code: "CLIENT_NOT_FOUND", message: "Client not found" });
    const definedInput = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
    const data = this.normalizeClientInput({ ...current, ...definedInput } as { name: string; primaryContactName: string; primaryEmail?: string | null; primaryPhone?: string | null; website?: string | null; status?: "LEAD" | "ONBOARDING" | "ACTIVE" | "PAUSED" | "ARCHIVED" }, current.primaryPhone);
    await this.assertUniqueClientName(actor, data.name, id);
    try {
      return await this.prisma.client.$transaction(async (tx) => {
        const client = await tx.client.update({ where: { id }, data });
        await tx.auditLog.create({ data: { agencyId: actor.agencyId, clientId: id, actorId: actor.userId, action: "CLIENT_UPDATED", entityType: "Client", entityId: id, metadata: { fields: Object.keys(data) } } });
        return client;
      });
    } catch (error) { this.rethrowDuplicateClient(error); }
  }
  async hub(actor: AgencyActor, id: string) { const client = await this.client(actor, id); const [requirements, communications, files, activity, notes] = await Promise.all([this.prisma.client.clientRequirement.findMany({ where: { agencyId: actor.agencyId, clientId: id }, include: requirementInclude, orderBy: { updatedAt: "desc" } }), this.prisma.client.clientCommunication.count({ where: { agencyId: actor.agencyId, clientId: id } }), this.prisma.client.clientAsset.count({ where: { agencyId: actor.agencyId, clientId: id, deletedAt: null } }), this.prisma.client.auditLog.count({ where: { agencyId: actor.agencyId, clientId: id } }), this.prisma.client.clientNote.count({ where: { agencyId: actor.agencyId, clientId: id } })]); return { client, requirements, communications: { available: true, total: communications }, files: { available: true, total: files }, activity: { available: true, total: activity + notes } }; }
  async requirements(actor: AgencyActor, clientId: string) { await this.assertClient(actor, clientId); return this.prisma.client.clientRequirement.findMany({ where: { agencyId: actor.agencyId, clientId }, include: requirementInclude, orderBy: { updatedAt: "desc" } }); }
  async requirement(actor: AgencyActor, id: string) { const r = await this.prisma.client.clientRequirement.findFirst({ where: { id, agencyId: actor.agencyId }, include: requirementInclude }); if (!r) throw new NotFoundException({ code: "REQUIREMENT_NOT_FOUND", message: "Requirement not found" }); return r; }
  async createRequirement(actor: AgencyActor, clientId: string, input: RequirementInput) {
    this.assertPermission(actor, "requirements:manage");
    this.assertBudget(input);
    await this.assertClient(actor, clientId);
    const { items = [], changeReason: _reason, ...data } = input;
    const fields = this.requirementData(data) as unknown as Prisma.ClientRequirementUncheckedCreateInput;
    return this.prisma.client.$transaction(async (tx) => {
      const requirement = await tx.clientRequirement.create({ data: { ...fields, agencyId: actor.agencyId, clientId, preparedById: actor.userId } });
      if (items.length) await tx.requirementItem.createMany({ data: items.map(({ title, description, category, requirementType, itemStatus, priority, notes, sortOrder }) => ({ agencyId: actor.agencyId, requirementId: requirement.id, title: title?.trim() || null, description: description?.trim() || null, category, requirementType, itemStatus, priority, notes: notes?.trim() || null, sortOrder })) });
      if (data.referenceLinks?.length) await tx.requirementReference.createMany({ data: data.referenceLinks.map((url) => ({ agencyId: actor.agencyId, requirementId: requirement.id, createdById: actor.userId, label: url, url })) });
      await tx.auditLog.create({ data: { agencyId: actor.agencyId, clientId, requirementId: requirement.id, actorId: actor.userId, action: "REQUIREMENT_CREATED", entityType: "ClientRequirement", entityId: requirement.id } });
      return tx.clientRequirement.findUniqueOrThrow({ where: { id: requirement.id }, include: requirementInclude });
    });
  }
  async updateRequirement(actor: AgencyActor, id: string, input: RequirementInput) {
    this.assertPermission(actor, "requirements:manage");
    this.assertBudget(input);
    const current = await this.requirement(actor, id);
    if (["CONFIRMED", "ARCHIVED"].includes(current.status)) throw new ConflictException({ code: "REQUIREMENT_IMMUTABLE", message: "Confirmed or archived requirements cannot be edited; request changes to create a traceable revision" });
    if (!["DRAFT", "CHANGES_REQUESTED"].includes(current.status)) throw new ConflictException({ code: "REQUIREMENT_NOT_EDITABLE", message: "Only draft requirements can be edited" });
    const { items, changeReason, ...data } = input;
    return this.prisma.client.$transaction(async (tx) => {
      await tx.clientRequirement.update({ where: { id }, data: this.requirementData(data) });
      if (data.referenceLinks !== undefined) {
        await tx.requirementReference.deleteMany({ where: { agencyId: actor.agencyId, requirementId: id } });
        if (data.referenceLinks.length) await tx.requirementReference.createMany({ data: data.referenceLinks.map((url) => ({ agencyId: actor.agencyId, requirementId: id, createdById: actor.userId, label: url, url })) });
      }
      if (items) {
        const existing = await tx.requirementItem.findMany({ where: { agencyId: actor.agencyId, requirementId: id }, select: { id: true } });
        const supplied = items.flatMap((item) => item.id ? [item.id] : []);
        if (supplied.some((itemId) => !existing.some((x) => x.id === itemId))) throw new BadRequestException({ code: "INVALID_REQUIREMENT_ITEM", message: "An item does not belong to this requirement" });
        await tx.requirementItem.deleteMany({ where: { agencyId: actor.agencyId, requirementId: id, id: { notIn: supplied } } });
        // Move old and new items into unique temporary slots before applying final order.
        for (const [index, item] of items.entries()) if (item.id) await tx.requirementItem.update({ where: { id: item.id }, data: { sortOrder: -index - 1 } });
        const resolved: Array<{ id: string; item: (typeof items)[number] }> = [];
        for (const [index, item] of items.entries()) {
          if (item.id) resolved.push({ id: item.id, item });
          else {
            const created = await tx.requirementItem.create({ data: { agencyId: actor.agencyId, requirementId: id, title: item.title?.trim() || null, description: item.description?.trim() || null, category: item.category, requirementType: item.requirementType, itemStatus: item.itemStatus, priority: item.priority, notes: item.notes?.trim() || null, sortOrder: -items.length - index - 1 } });
            resolved.push({ id: created.id, item });
          }
        }
        for (const { id: itemId, item } of resolved) await tx.requirementItem.update({ where: { id: itemId }, data: { title: item.title?.trim() || null, description: item.description?.trim() || null, category: item.category, requirementType: item.requirementType, itemStatus: item.itemStatus, priority: item.priority, notes: item.notes?.trim() || null, sortOrder: item.sortOrder } });
      }
      await tx.auditLog.create({ data: { agencyId: actor.agencyId, clientId: current.clientId, requirementId: id, actorId: actor.userId, action: "REQUIREMENT_UPDATED", entityType: "ClientRequirement", entityId: id, metadata: { changeReason } } });
      return tx.clientRequirement.findUniqueOrThrow({ where: { id }, include: requirementInclude });
    });
  }
  async transition(actor: AgencyActor, id: string, status: "DRAFT" | "UNDER_REVIEW" | "CONFIRMED" | "CHANGES_REQUESTED" | "ARCHIVED", reason?: string) {
    const current = await this.requirement(actor, id);
    const allowed: Record<string, string[]> = { DRAFT: ["UNDER_REVIEW", "ARCHIVED"], UNDER_REVIEW: ["DRAFT", "CHANGES_REQUESTED", "CONFIRMED", "ARCHIVED"], CHANGES_REQUESTED: ["DRAFT", "UNDER_REVIEW", "ARCHIVED"], CONFIRMED: ["CHANGES_REQUESTED", "ARCHIVED"], ARCHIVED: [] };
    if (!allowed[current.status]?.includes(status)) throw new ConflictException({ code: "INVALID_STATUS_TRANSITION", message: `Cannot transition requirement from ${current.status} to ${status}` });
    if (status === "CONFIRMED" && !actor.permissions.includes("requirements:confirm")) throw new ForbiddenException({ code: "PERMISSION_DENIED", message: "Requirement confirmation permission is required" });
    if (status === "UNDER_REVIEW" || status === "CONFIRMED") this.validateRequirementForApproval(current);
    return this.prisma.client.$transaction(async (tx) => {
      const now = new Date();
      const updated = await tx.clientRequirement.update({ where: { id }, data: { status, ...(status === "CONFIRMED" ? { confirmedById: actor.userId, confirmedAt: now } : {}), ...(status === "CHANGES_REQUESTED" ? { confirmedById: null, confirmedAt: null } : {}) }, include: requirementInclude });
      let revisionVersion: number | undefined;
      if (status === "CONFIRMED") {
        const { items, references, revisions, preparedBy, confirmedBy, ...snapshot } = updated;
        revisionVersion = await tx.requirementRevision.count({ where: { agencyId: actor.agencyId, requirementId: id } }) + 1;
        const contentSnapshot = JSON.parse(JSON.stringify({ ...snapshot, items, references })) as Prisma.InputJsonValue;
        await tx.requirementRevision.create({ data: { agencyId: actor.agencyId, requirementId: id, version: revisionVersion, contentSnapshot, changeReason: reason, confirmedById: actor.userId, confirmedAt: now } });
      }
      await tx.auditLog.create({ data: { agencyId: actor.agencyId, clientId: current.clientId, requirementId: id, actorId: actor.userId, action: `REQUIREMENT_${status}`, entityType: "ClientRequirement", entityId: id, eventAt: now, metadata: { from: current.status, to: status } } });
      if (revisionVersion) await tx.auditLog.create({ data: { agencyId: actor.agencyId, clientId: current.clientId, requirementId: id, actorId: actor.userId, action: "REQUIREMENT_REVISION_CREATED", entityType: "RequirementRevision", entityId: id, eventAt: now, metadata: { version: revisionVersion } } });
      return tx.clientRequirement.findUniqueOrThrow({ where: { id }, include: requirementInclude });
    });
  }
  async exportConfirmed(actor: AgencyActor, id: string) { const r = await this.requirement(actor, id); if (r.status !== "CONFIRMED") throw new ConflictException({ code: "REQUIREMENT_NOT_CONFIRMED", message: "Only a confirmed requirement can be exported" }); const revision = r.revisions.find((item) => item.version === r.revisions[0]?.version); if (!revision) throw new ConflictException({ code: "CONFIRMED_VERSION_MISSING", message: "No approved revision is available" }); return { contractVersion: "1.0", requirementId: id, clientId: r.clientId, status: "CONFIRMED", approvedVersion: revision.version, confirmedAt: revision.confirmedAt, confirmedBy: revision.confirmedBy, requirement: revision.contentSnapshot }; }
  private requirementData(data: RequirementInput): Prisma.ClientRequirementUncheckedUpdateInput { const { items: _items, changeReason: _reason, referenceLinks, targetDate, ...rest } = data; const result: Record<string, unknown> = { ...rest }; if (targetDate !== undefined) result.targetDate = targetDate ? new Date(targetDate) : null; if (referenceLinks !== undefined) result.referenceLinks = referenceLinks; return result as Prisma.ClientRequirementUncheckedUpdateInput; }
  private assertPermission(actor: AgencyActor, permission: string) { if (!actor.permissions.includes(permission)) throw new ForbiddenException({ code: "PERMISSION_DENIED", message: `Required permission ${permission} is missing` }); }
  private assertBudget(input: RequirementInput) {
    const min = input.budgetMin == null ? null : Number(input.budgetMin), max = input.budgetMax == null ? null : Number(input.budgetMax);
    if ([min, max].some((value) => value !== null && (!Number.isFinite(value) || value < 0))) throw new BadRequestException({ code: "INVALID_BUDGET", message: "Budget values must be non-negative numbers" });
    if (min !== null && max !== null && min > max) throw new BadRequestException({ code: "INVALID_BUDGET_RANGE", message: "Budget minimum cannot exceed budget maximum" });
    if (input.currency) {
      const currency = input.currency.toUpperCase();
      if (!/^[A-Z]{3}$/.test(currency) || !Intl.supportedValuesOf("currency").includes(currency)) throw new BadRequestException({ code: "INVALID_CURRENCY", message: "Use a valid three-letter ISO currency code" });
    }
    if (input.expectedTimeline && !/^\d+(?:\.\d+)?\s+(?:days?|weeks?|months?)$/i.test(input.expectedTimeline)) throw new BadRequestException({ code: "INVALID_TIMELINE", message: "Expected timeline must be a positive number followed by days, weeks or months" });
    if (input.expectedTimeline && Number(input.expectedTimeline.trim().split(/\s+/)[0]) <= 0) throw new BadRequestException({ code: "INVALID_TIMELINE", message: "Expected timeline must be greater than zero" });
    if (input.targetDate && input.targetDate.slice(0, 10) < new Date().toISOString().slice(0, 10)) throw new BadRequestException({ code: "TARGET_DATE_IN_PAST", message: "Target date cannot be in the past" });
  }
  private async assertClient(actor: AgencyActor, clientId: string) { const exists = await this.prisma.client.client.findFirst({ where: { id: clientId, agencyId: actor.agencyId }, select: { id: true } }); if (!exists) throw new NotFoundException({ code: "CLIENT_NOT_FOUND", message: "Client not found" }); }

  private normalizeClientInput(input: { name: unknown; primaryContactName: unknown; primaryEmail?: unknown; primaryPhone?: unknown; website?: unknown; status?: unknown }, previousPhone?: string | null) {
    const asText = (value: unknown) => typeof value === "string" ? value.trim() : "";
    const name = asText(input.name), primaryContactName = asText(input.primaryContactName);
    if (name.length < 2 || name.length > 150) throw new BadRequestException({ code: "INVALID_COMPANY_NAME", message: "Company name must contain 2 to 150 characters" });
    if (primaryContactName.length < 2 || primaryContactName.length > 100 || !/^(?=.*\p{L})[\p{L}\p{M} .'-]+$/u.test(primaryContactName)) throw new BadRequestException({ code: "INVALID_PRIMARY_CONTACT", message: "Enter a 2 to 100 character contact name using letters, spaces, initials, dots, apostrophes or hyphens" });
    const primaryEmail = asText(input.primaryEmail).toLowerCase() || null;
    if (primaryEmail && !isEmail(primaryEmail)) throw new BadRequestException({ code: "INVALID_EMAIL", message: "Enter a valid email address" });
    const rawPhone = asText(input.primaryPhone);
    let primaryPhone: string | null = null;
    if (rawPhone) {
      const parsed = parsePhoneNumberFromString(rawPhone), digitCount = rawPhone.replace(/\D/g, "").length;
      if (digitCount < 7 || digitCount > 15 || !isValidPhoneNumber(rawPhone) || !parsed) {
        if (previousPhone === rawPhone) primaryPhone = rawPhone;
        else throw new BadRequestException({ code: "INVALID_PHONE", message: "Enter a valid phone number with country code (7 to 15 digits)" });
      } else primaryPhone = parsed.number;
    }
    let website = asText(input.website) || null;
    if (website?.toLowerCase().startsWith("www.")) website = `https://${website}`;
    if (website) { try { const parsed = new URL(website); if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) throw new Error(); website = parsed.toString().replace(/\/$/, ""); } catch { throw new BadRequestException({ code: "INVALID_WEBSITE", message: "Website must be a valid HTTP or HTTPS URL" }); } }
    if (!primaryEmail && !primaryPhone && !website) throw new BadRequestException({ code: "CONTACT_METHOD_REQUIRED", message: "Provide at least one contact method: email, phone or website" });
    return { name, primaryContactName, primaryEmail, primaryPhone, website, ...(input.status ? { status: input.status as "LEAD" | "ONBOARDING" | "ACTIVE" | "PAUSED" | "ARCHIVED" } : {}) };
  }

  private async assertUniqueClientName(actor: AgencyActor, name: string, exceptId?: string) {
    const existing = await this.prisma.client.client.findFirst({ where: { agencyId: actor.agencyId, name: { equals: name, mode: "insensitive" }, ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { id: true } });
    if (existing) throw new ConflictException({ code: "DUPLICATE_CLIENT_NAME", message: "A client with this company name already exists in your agency" });
  }
  private rethrowDuplicateClient(error: unknown): never {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") throw new ConflictException({ code: "DUPLICATE_CLIENT_NAME", message: "A client with this company name already exists in your agency" });
    throw error;
  }

  private validateRequirementForApproval(requirement: { title: string | null; businessObjective: string | null; requestedServices: string[]; items: Array<{ title: string | null; description: string | null; requirementType: string; priority: string }>; budgetMin: Prisma.Decimal | null; budgetMax: Prisma.Decimal | null; currency: string | null; expectedTimeline: string | null; targetDate: Date | null; designPreferences: string | null; constraints: string | null; assumptions: string | null; additionalNotes: string | null; referenceLinks: string[] }) {
    const errors: string[] = [];
    if (!requirement.title || requirement.title.trim().length < 3 || requirement.title.length > 150) errors.push("Requirement title must be 3 to 150 characters");
    if (!requirement.businessObjective || requirement.businessObjective.trim().length < 10 || requirement.businessObjective.length > 2000) errors.push("Business objective must be 10 to 2,000 characters");
    if (!requirement.requestedServices.length || requirement.requestedServices.some((service) => !(requestedServiceOptions as readonly string[]).includes(service))) errors.push("Select at least one valid requested service");
    if (!requirement.items.length) errors.push("Add at least one requirement item");
    requirement.items.forEach((item, index) => {
      if (!item.title || item.title.trim().length < 3 || item.title.length > 150) errors.push(`Item ${index + 1}: title must be 3 to 150 characters`);
      if (!item.description || item.description.trim().length < 3 || item.description.length > 500) errors.push(`Item ${index + 1}: description must be 3 to 500 characters`);
      if (!(requirementTypes as readonly string[]).includes(item.requirementType)) errors.push(`Item ${index + 1}: select Functional or Non-functional`);
      if (!("LOW,NORMAL,HIGH,URGENT".split(",")).includes(item.priority)) errors.push(`Item ${index + 1}: select a valid priority`);
    });
    if (requirement.referenceLinks.length > 10 || new Set(requirement.referenceLinks).size !== requirement.referenceLinks.length) errors.push("Use no more than 10 unique reference URLs");
    const min = requirement.budgetMin === null ? null : Number(requirement.budgetMin), max = requirement.budgetMax === null ? null : Number(requirement.budgetMax);
    if ([min, max].some((value) => value !== null && (!Number.isFinite(value) || value < 0))) errors.push("Budget values must be non-negative");
    if (min !== null && max !== null && min > max) errors.push("Budget maximum must be greater than or equal to minimum");
    if ((min !== null || max !== null) && !requirement.currency) errors.push("Currency is required when a budget is entered");
    if (requirement.currency) { try { new Intl.NumberFormat("en", { style: "currency", currency: requirement.currency }); } catch { errors.push("Choose a valid ISO currency code"); } }
    if (requirement.expectedTimeline && !/^\d+(?:\.\d+)?\s+(?:days?|weeks?|months?)$/i.test(requirement.expectedTimeline)) errors.push("Expected timeline must be a positive number followed by days, weeks or months");
    if (requirement.targetDate && requirement.targetDate.toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10)) errors.push("Target date cannot be in the past");
    if ((requirement.designPreferences?.length ?? 0) > 2000 || (requirement.constraints?.length ?? 0) > 2000 || (requirement.assumptions?.length ?? 0) > 2000) errors.push("Design preferences, constraints and assumptions cannot exceed 2,000 characters");
    if ((requirement.additionalNotes?.length ?? 0) > 5000) errors.push("Additional notes cannot exceed 5,000 characters");
    if (errors.length) throw new BadRequestException({ code: "REQUIREMENT_INCOMPLETE", message: "Complete the requirement details before submitting for review", details: { errors } });
  }
}
