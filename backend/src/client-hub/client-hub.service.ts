import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "../generated/prisma/client";
import type { AgencyActor } from "../common/auth/agency-context";
import { PrismaService } from "../prisma/prisma.service";

const requirementInclude = { items: { orderBy: { sortOrder: "asc" as const } }, references: true, revisions: { orderBy: { version: "desc" as const }, include: { confirmedBy: { select: { id: true, name: true } } } }, preparedBy: { select: { id: true, name: true } }, confirmedBy: { select: { id: true, name: true } } };
const DEVELOPMENT_AGENCY_ID = "a8b9a002-4f48-44b3-9b22-289b2f2f1a01";
type RequirementInput = { title?: string; businessObjective?: string; requestedServices?: string[]; designPreferences?: string | null; referenceLinks?: string[]; budgetMin?: string | number | null; budgetMax?: string | number | null; currency?: string | null; expectedTimeline?: string | null; targetDate?: string | null; constraints?: string | null; assumptions?: string | null; additionalNotes?: string | null; items?: Array<{ id?: string; title: string; description?: string | null; category?: string | null; priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT"; notes?: string | null; sortOrder: number }>; changeReason?: string };

@Injectable()
export class ClientHubService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}
  capabilities() { return { implemented: ["health-check", "client-management", "requirement-workflow", "confirmed-requirement-export"], planned: ["communications", "file-management", "activity-timeline"] }; }

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
  async createClient(actor: AgencyActor, input: { name: string; primaryContactName?: string; primaryEmail?: string; primaryPhone?: string; website?: string; status?: "LEAD" | "ONBOARDING" | "ACTIVE" | "PAUSED" | "ARCHIVED" }) { this.assertPermission(actor, "clients:manage"); return this.prisma.client.client.create({ data: { ...input, agencyId: actor.agencyId } }); }
  async client(actor: AgencyActor, id: string) { const row = await this.prisma.client.client.findFirst({ where: { id, agencyId: actor.agencyId }, include: { notes: { orderBy: { createdAt: "desc" }, take: 10, include: { author: { select: { id: true, name: true } } } }, _count: { select: { requirements: true, projects: true } } } }); if (!row) throw new NotFoundException({ code: "CLIENT_NOT_FOUND", message: "Client not found" }); return row; }
  async updateClient(actor: AgencyActor, id: string, data: Record<string, unknown>) { this.assertPermission(actor, "clients:manage"); const exists = await this.prisma.client.client.findFirst({ where: { id, agencyId: actor.agencyId }, select: { id: true } }); if (!exists) throw new NotFoundException({ code: "CLIENT_NOT_FOUND", message: "Client not found" }); return this.prisma.client.client.update({ where: { id }, data }); }
  async hub(actor: AgencyActor, id: string) { const client = await this.client(actor, id); const requirements = await this.prisma.client.clientRequirement.findMany({ where: { agencyId: actor.agencyId, clientId: id }, include: requirementInclude, orderBy: { updatedAt: "desc" } }); return { client, requirements, communications: { available: false, items: [] }, files: { available: false, items: [] }, activity: { available: false, items: [] } }; }
  async requirements(actor: AgencyActor, clientId: string) { await this.assertClient(actor, clientId); return this.prisma.client.clientRequirement.findMany({ where: { agencyId: actor.agencyId, clientId }, include: requirementInclude, orderBy: { updatedAt: "desc" } }); }
  async requirement(actor: AgencyActor, id: string) { const r = await this.prisma.client.clientRequirement.findFirst({ where: { id, agencyId: actor.agencyId }, include: requirementInclude }); if (!r) throw new NotFoundException({ code: "REQUIREMENT_NOT_FOUND", message: "Requirement not found" }); return r; }
  async createRequirement(actor: AgencyActor, clientId: string, input: RequirementInput) {
    this.assertPermission(actor, "requirements:manage");
    this.assertBudget(input);
    await this.assertClient(actor, clientId);
    const { items = [], changeReason: _reason, ...data } = input;
    const fields = this.requirementData(data) as unknown as Prisma.ClientRequirementUncheckedCreateInput;
    return this.prisma.client.$transaction(async (tx) => {
      const requirement = await tx.clientRequirement.create({ data: { ...fields, agencyId: actor.agencyId, clientId, preparedById: actor.userId, title: data.title!, businessObjective: data.businessObjective! } });
      if (items.length) await tx.requirementItem.createMany({ data: items.map(({ title, description, category, priority, notes, sortOrder }) => ({ agencyId: actor.agencyId, requirementId: requirement.id, title, description, category, priority, notes, sortOrder })) });
      if (data.referenceLinks?.length) await tx.requirementReference.createMany({ data: data.referenceLinks.map((url) => ({ agencyId: actor.agencyId, requirementId: requirement.id, createdById: actor.userId, label: url, url })) });
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
            const created = await tx.requirementItem.create({ data: { agencyId: actor.agencyId, requirementId: id, title: item.title, description: item.description, category: item.category, priority: item.priority, notes: item.notes, sortOrder: -items.length - index - 1 } });
            resolved.push({ id: created.id, item });
          }
        }
        for (const { id: itemId, item } of resolved) await tx.requirementItem.update({ where: { id: itemId }, data: { title: item.title, description: item.description, category: item.category, priority: item.priority, notes: item.notes, sortOrder: item.sortOrder } });
      }
      await tx.auditLog.create({ data: { agencyId: actor.agencyId, actorId: actor.userId, action: "REQUIREMENT_UPDATED", entityType: "ClientRequirement", entityId: id, metadata: { changeReason } } });
      return tx.clientRequirement.findUniqueOrThrow({ where: { id }, include: requirementInclude });
    });
  }
  async transition(actor: AgencyActor, id: string, status: "DRAFT" | "UNDER_REVIEW" | "CONFIRMED" | "CHANGES_REQUESTED" | "ARCHIVED", reason?: string) { const current = await this.requirement(actor, id); const allowed: Record<string, string[]> = { DRAFT: ["UNDER_REVIEW", "ARCHIVED"], UNDER_REVIEW: ["DRAFT", "CHANGES_REQUESTED", "CONFIRMED", "ARCHIVED"], CHANGES_REQUESTED: ["DRAFT", "UNDER_REVIEW", "ARCHIVED"], CONFIRMED: ["CHANGES_REQUESTED", "ARCHIVED"], ARCHIVED: [] }; if (!allowed[current.status]?.includes(status)) throw new ConflictException({ code: "INVALID_STATUS_TRANSITION", message: `Cannot transition requirement from ${current.status} to ${status}` }); if (status === "CONFIRMED" && !actor.permissions.includes("requirements:confirm")) throw new ForbiddenException({ code: "PERMISSION_DENIED", message: "Requirement confirmation permission is required" }); return this.prisma.client.$transaction(async (tx) => { const now = new Date(); const updated = await tx.clientRequirement.update({ where: { id }, data: { status, ...(status === "CONFIRMED" ? { confirmedById: actor.userId, confirmedAt: now } : {}), ...(status === "CHANGES_REQUESTED" ? { confirmedById: null, confirmedAt: null } : {}) }, include: requirementInclude }); if (status === "CONFIRMED") { const { items, references, revisions, preparedBy, confirmedBy, ...snapshot } = updated; const version = await tx.requirementRevision.count({ where: { agencyId: actor.agencyId, requirementId: id } }) + 1; const contentSnapshot = JSON.parse(JSON.stringify({ ...snapshot, items, references })) as Prisma.InputJsonValue; await tx.requirementRevision.create({ data: { agencyId: actor.agencyId, requirementId: id, version, contentSnapshot, changeReason: reason, confirmedById: actor.userId, confirmedAt: now } }); } await tx.auditLog.create({ data: { agencyId: actor.agencyId, actorId: actor.userId, action: `REQUIREMENT_${status}`, entityType: "ClientRequirement", entityId: id, metadata: { from: current.status, to: status, reason } } }); return tx.clientRequirement.findUniqueOrThrow({ where: { id }, include: requirementInclude }); }); }
  async exportConfirmed(actor: AgencyActor, id: string) { const r = await this.requirement(actor, id); if (r.status !== "CONFIRMED") throw new ConflictException({ code: "REQUIREMENT_NOT_CONFIRMED", message: "Only a confirmed requirement can be exported" }); const revision = r.revisions.find((item) => item.version === r.revisions[0]?.version); if (!revision) throw new ConflictException({ code: "CONFIRMED_VERSION_MISSING", message: "No approved revision is available" }); return { contractVersion: "1.0", requirementId: id, clientId: r.clientId, status: "CONFIRMED", approvedVersion: revision.version, confirmedAt: revision.confirmedAt, confirmedBy: revision.confirmedBy, requirement: revision.contentSnapshot }; }
  private requirementData(data: RequirementInput): Prisma.ClientRequirementUncheckedUpdateInput { const { items: _items, changeReason: _reason, referenceLinks, targetDate, ...rest } = data; const result: Record<string, unknown> = { ...rest }; if (targetDate !== undefined) result.targetDate = targetDate ? new Date(targetDate) : null; if (referenceLinks !== undefined) result.referenceLinks = referenceLinks; return result as Prisma.ClientRequirementUncheckedUpdateInput; }
  private assertPermission(actor: AgencyActor, permission: string) { if (!actor.permissions.includes(permission)) throw new ForbiddenException({ code: "PERMISSION_DENIED", message: `Required permission ${permission} is missing` }); }
  private assertBudget(input: RequirementInput) { const min = input.budgetMin == null ? null : Number(input.budgetMin); const max = input.budgetMax == null ? null : Number(input.budgetMax); if (min !== null && max !== null && min > max) throw new BadRequestException({ code: "INVALID_BUDGET_RANGE", message: "Budget minimum cannot exceed budget maximum" }); if ((min !== null || max !== null) && !input.currency) throw new BadRequestException({ code: "CURRENCY_REQUIRED", message: "A currency is required when a budget is supplied" }); }
  private async assertClient(actor: AgencyActor, clientId: string) { const exists = await this.prisma.client.client.findFirst({ where: { id: clientId, agencyId: actor.agencyId }, select: { id: true } }); if (!exists) throw new NotFoundException({ code: "CLIENT_NOT_FOUND", message: "Client not found" }); }
}
