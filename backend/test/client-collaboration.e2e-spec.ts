import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { ApiExceptionFilter } from "../src/common/http/api-exception.filter";
import { ApiResponseInterceptor } from "../src/common/http/api-response.interceptor";
import { PrismaService } from "../src/prisma/prisma.service";
import { LocalAssetStorageService } from "../src/client-hub/local-asset-storage.service";

describe("Client collaboration API (e2e)", () => {
  let app: INestApplication; let prisma: PrismaService; let storage: LocalAssetStorageService;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication(); app.setGlobalPrefix("api");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new ApiExceptionFilter()); app.useGlobalInterceptors(new ApiResponseInterceptor());
    await app.init(); prisma = app.get(PrismaService); storage = app.get(LocalAssetStorageService);
  });
  afterAll(async () => app.close());

  it("logs and filters communications, creates timeline events, and rejects cross-agency associations", async () => {
    const tag = crypto.randomUUID(); let clientId = ""; let requirementId = ""; let foreignAgencyId = ""; let foreignClientId = ""; let foreignUserId = ""; let foreignRequirementId = "";
    try {
      const client = await request(app.getHttpServer()).post("/api/clients").send({ name: `Communication e2e-${tag}`, primaryContactName: "QA Contact", primaryEmail: `comm-${tag}@example.invalid` }).expect(201); clientId = client.body.data.id;
      const requirement = await request(app.getHttpServer()).post(`/api/clients/${clientId}/requirements`).send({ title: "Meeting subject", businessObjective: "Document decisions" }).expect(201); requirementId = requirement.body.data.id;
      const occurredAt = "2026-10-31T10:30:00.000Z";
      const meeting = await request(app.getHttpServer()).post(`/api/clients/${clientId}/communications`).send({ type: "MEETING", subject: "Discovery call", summary: "Reviewed launch goals", participants: ["Client contact", "Account lead"], occurredAt, requirementId, followUpNotes: "Send a summary" }).expect(201);
      expect(meeting.body.data.occurredAt).toBe(occurredAt);
      expect(new Date(meeting.body.data.createdAt).toISOString()).not.toBe(occurredAt);
      await request(app.getHttpServer()).post(`/api/clients/${clientId}/communications`).send({ type: "CALL", subject: "Check-in", summary: "Routine update", occurredAt: "2026-10-30T10:30:00.000Z" }).expect(201);
      const filtered = await request(app.getHttpServer()).get(`/api/clients/${clientId}/communications`).query({ type: "MEETING", from: "2026-10-01T00:00:00Z", to: "2026-11-01T00:00:00Z" }).expect(200);
      expect(filtered.body.data.items).toHaveLength(1); expect(filtered.body.data.items[0].id).toBe(meeting.body.data.id);
      await request(app.getHttpServer()).post(`/api/clients/${clientId}/communications`).send({ type: "CALL", subject: "Bad date", summary: "No", occurredAt: "not-a-date" }).expect(400);
      await request(app.getHttpServer()).get(`/api/clients/${clientId}/communications`).query({ from: "2026-11-02T00:00:00Z", to: "2026-11-01T00:00:00Z" }).expect(400);

      foreignAgencyId = crypto.randomUUID(); foreignClientId = crypto.randomUUID(); foreignUserId = crypto.randomUUID(); foreignRequirementId = crypto.randomUUID();
      await prisma.client.agency.create({ data: { id: foreignAgencyId, name: `Foreign comm ${tag}` } });
      await prisma.client.client.create({ data: { id: foreignClientId, agencyId: foreignAgencyId, name: `Foreign client ${tag}`, primaryContactName: "Foreign Tester", primaryEmail: `foreign-${tag}@example.invalid` } });
      await prisma.client.user.create({ data: { id: foreignUserId, agencyId: foreignAgencyId, email: `foreign-${tag}@example.invalid`, name: "Foreign test actor" } });
      await prisma.client.clientRequirement.create({ data: { id: foreignRequirementId, agencyId: foreignAgencyId, clientId: foreignClientId, preparedById: foreignUserId, title: "Foreign requirement", businessObjective: "Isolation fixture" } });
      await request(app.getHttpServer()).get(`/api/clients/${foreignClientId}/communications`).expect(404);
      await request(app.getHttpServer()).post(`/api/clients/${clientId}/communications`).send({ type: "EMAIL", subject: "Cross link", summary: "No", occurredAt, requirementId: foreignRequirementId }).expect(404);
      await request(app.getHttpServer()).get(`/api/clients/${foreignClientId}/timeline`).expect(404);
      const actor = await prisma.client.user.findFirstOrThrow({ where: { agencyId: client.body.data.agencyId }, select: { id: true } });
      await prisma.client.clientNote.create({ data: { agencyId: client.body.data.agencyId, clientId, authorId: actor.id, content: "Private note body must not leak into the timeline" } });

      const timeline = await request(app.getHttpServer()).get(`/api/clients/${clientId}/timeline`).expect(200);
      const events = timeline.body.data.items;
      expect(events.some((event: { eventType: string }) => event.eventType === "CLIENT_CREATED")).toBe(true);
      const noteEvent = events.find((event: { eventType: string }) => event.eventType === "CLIENT_NOTE_ADDED");
      expect(noteEvent.description).toBe("Client note added");
      expect(JSON.stringify(noteEvent)).not.toContain("Private note body");
      const commEvent = events.find((event: { eventType: string; requirementId: string | null }) => event.eventType === "COMMUNICATION_RECORDED" && event.requirementId === requirementId);
      expect(commEvent.occurredAt).toBe(occurredAt);
      expect(events.every((event: { metadata?: unknown }) => event.metadata === undefined)).toBe(true);
      for (let index = 1; index < events.length; index++) {
        const previous = events[index - 1]; const current = events[index];
        expect(new Date(previous.occurredAt).getTime()).toBeGreaterThanOrEqual(new Date(current.occurredAt).getTime());
        if (previous.occurredAt === current.occurredAt) expect(previous.id.localeCompare(current.id)).toBeGreaterThan(0);
      }
    } finally {
      if (foreignAgencyId) {
        await prisma.client.auditLog.deleteMany({ where: { agencyId: foreignAgencyId } });
        await prisma.client.clientRequirement.deleteMany({ where: { id: foreignRequirementId } });
        await prisma.client.user.deleteMany({ where: { id: foreignUserId } });
        await prisma.client.client.deleteMany({ where: { id: foreignClientId } });
        await prisma.client.agency.deleteMany({ where: { id: foreignAgencyId } });
      }
      if (clientId) await cleanupClient(clientId);
    }
  });

  it("validates uploads, scopes downloads to the actor agency, and soft-removes files", async () => {
    const tag = crypto.randomUUID(); let clientId = ""; let requirementId = ""; let assetId = ""; let foreignAgencyId = ""; let foreignClientId = ""; let foreignUserId = ""; let foreignRequirementId = ""; let foreignAssetId = ""; let storageKey: string | null = null;
    try {
      const client = await request(app.getHttpServer()).post("/api/clients").send({ name: `Files e2e-${tag}`, primaryContactName: "QA Contact", primaryEmail: `files-${tag}@example.invalid` }).expect(201); clientId = client.body.data.id;
      const requirement = await request(app.getHttpServer()).post(`/api/clients/${clientId}/requirements`).send({ title: "Client file association", businessObjective: "Store a scoped file" }).expect(201); requirementId = requirement.body.data.id;
      const pdf = Buffer.from("%PDF-1.7 test fixture");
      const uploaded = await request(app.getHttpServer()).post(`/api/clients/${clientId}/files`).attach("file", pdf, { filename: "../../private-plan.pdf", contentType: "application/pdf" }).field("label", "Project brief").field("requirementId", requirementId).expect(201);
      assetId = uploaded.body.data.id;
      expect(uploaded.body.data.originalName).toBe("private-plan.pdf");
      expect(uploaded.body.data.requirementId).toBe(requirementId);
      expect(uploaded.body.data.storageKey).toBeUndefined();
      expect(uploaded.body.data.agencyId).toBeUndefined();
      const stored = await prisma.client.clientAsset.findUniqueOrThrow({ where: { id: assetId }, select: { storageKey: true } }); storageKey = stored.storageKey;
      const download = await request(app.getHttpServer()).get(`/api/assets/${assetId}/download`).expect(200);
      expect(download.headers["x-content-type-options"]).toBe("nosniff"); expect(download.body).toEqual(pdf);
      await request(app.getHttpServer()).post(`/api/clients/${clientId}/files`).attach("file", Buffer.from("not pdf"), { filename: "bad.pdf", contentType: "application/pdf" }).expect(400);
      await request(app.getHttpServer()).post(`/api/clients/${clientId}/files`).attach("file", Buffer.from("no file type"), { filename: "nope.txt", contentType: "text/plain" }).expect(400);
      await request(app.getHttpServer()).post(`/api/clients/${clientId}/references`).send({ label: "Prototype", url: "https://example.org/prototype" }).expect(201);
      const scopedAssets = await request(app.getHttpServer()).get(`/api/clients/${clientId}/assets`).query({ requirementId }).expect(200);
      expect(scopedAssets.body.data.items.map((asset: { id: string }) => asset.id)).toContain(assetId);

      foreignAgencyId = crypto.randomUUID(); foreignClientId = crypto.randomUUID(); foreignUserId = crypto.randomUUID(); foreignRequirementId = crypto.randomUUID(); foreignAssetId = crypto.randomUUID();
      await prisma.client.agency.create({ data: { id: foreignAgencyId, name: `Foreign file ${tag}` } });
      await prisma.client.client.create({ data: { id: foreignClientId, agencyId: foreignAgencyId, name: `Foreign client ${tag}`, primaryContactName: "Foreign Tester", primaryEmail: `file-${tag}@example.invalid` } });
      await prisma.client.user.create({ data: { id: foreignUserId, agencyId: foreignAgencyId, email: `file-${tag}@example.invalid`, name: "Foreign test uploader" } });
      await prisma.client.clientRequirement.create({ data: { id: foreignRequirementId, agencyId: foreignAgencyId, clientId: foreignClientId, preparedById: foreignUserId, title: "Foreign file requirement", businessObjective: "Cross-tenant association fixture" } });
      await prisma.client.clientAsset.create({ data: { id: foreignAssetId, agencyId: foreignAgencyId, clientId: foreignClientId, type: "FILE", originalName: "foreign.pdf", mimeType: "application/pdf", fileSize: 8, storageKey: `${crypto.randomUUID()}.pdf`, label: "Foreign file", uploadedById: foreignUserId } });
      await request(app.getHttpServer()).post(`/api/clients/${clientId}/files`).attach("file", pdf, { filename: "foreign-link.pdf", contentType: "application/pdf" }).field("requirementId", foreignRequirementId).expect(404);
      await request(app.getHttpServer()).get(`/api/assets/${foreignAssetId}/download`).expect(404);
      await request(app.getHttpServer()).get(`/api/clients/${foreignClientId}/assets`).expect(404);

      await request(app.getHttpServer()).delete(`/api/assets/${assetId}`).expect(200);
      await request(app.getHttpServer()).get(`/api/assets/${assetId}/download`).expect(404);
      expect(await prisma.client.clientAsset.findFirst({ where: { id: assetId, deletedAt: { not: null } } })).toBeTruthy();
    } finally {
      if (storageKey) await storage.discard(storageKey);
      if (foreignAgencyId) {
        await prisma.client.auditLog.deleteMany({ where: { agencyId: foreignAgencyId } });
        await prisma.client.clientAsset.deleteMany({ where: { id: foreignAssetId } });
        await prisma.client.clientRequirement.deleteMany({ where: { id: foreignRequirementId } });
        await prisma.client.user.deleteMany({ where: { id: foreignUserId } });
        await prisma.client.client.deleteMany({ where: { id: foreignClientId } });
        await prisma.client.agency.deleteMany({ where: { id: foreignAgencyId } });
      }
      if (clientId) await cleanupClient(clientId);
    }
  });

  async function cleanupClient(clientId: string) {
    const requirements = await prisma.client.clientRequirement.findMany({ where: { clientId }, select: { id: true } });
    await prisma.client.auditLog.deleteMany({ where: { clientId } });
    await prisma.client.clientNote.deleteMany({ where: { clientId } });
    await prisma.client.clientCommunication.deleteMany({ where: { clientId } });
    await prisma.client.clientAsset.deleteMany({ where: { clientId } });
    for (const requirement of requirements) {
      await prisma.client.requirementRevision.deleteMany({ where: { requirementId: requirement.id } });
      await prisma.client.requirementReference.deleteMany({ where: { requirementId: requirement.id } });
      await prisma.client.requirementItem.deleteMany({ where: { requirementId: requirement.id } });
      await prisma.client.clientRequirement.deleteMany({ where: { id: requirement.id } });
    }
    await prisma.client.client.deleteMany({ where: { id: clientId } });
  }
});
