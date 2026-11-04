import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { ApiExceptionFilter } from "../src/common/http/api-exception.filter";
import { ApiResponseInterceptor } from "../src/common/http/api-response.interceptor";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Client Hub database API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication(); app.setGlobalPrefix("api");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new ApiExceptionFilter()); app.useGlobalInterceptors(new ApiResponseInterceptor());
    await app.init(); prisma = app.get(PrismaService);
  });
  afterAll(async () => app.close());

  it("returns only tenant-scoped overview counts and recent records", async () => {
    const tag = crypto.randomUUID();
    let clientId = "";
    const foreignAgencyId = crypto.randomUUID();
    const foreignClientId = crypto.randomUUID();
    try {
      const ownClient = await request(app.getHttpServer()).post("/api/clients").send({ name: `Overview ${tag}`, primaryContactName: "Overview Tester", primaryEmail: `overview-${tag}@example.invalid` }).expect(201);
      clientId = ownClient.body.data.id;
      await prisma.client.agency.create({ data: { id: foreignAgencyId, name: `Overview foreign ${tag}` } });
      await prisma.client.client.create({ data: { id: foreignClientId, agencyId: foreignAgencyId, name: `Foreign overview ${tag}`, primaryContactName: "Foreign Tester", primaryEmail: `overview-foreign-${tag}@example.invalid` } });

      const response = await request(app.getHttpServer()).get("/api/client-hub/overview").expect(200);
      expect(response.body.data.metrics.totalClients).toBeGreaterThanOrEqual(1);
      expect(response.body.data.recentClients.some((client: { id: string }) => client.id === clientId)).toBe(true);
      expect(response.body.data.recentClients.some((client: { id: string }) => client.id === foreignClientId)).toBe(false);
      expect(response.body.data).not.toHaveProperty("auditMetadata");
      expect(response.body.data.recentActivity.every((event: { description: string; clientId: string }) => Boolean(event.description) && Boolean(event.clientId))).toBe(true);
    } finally {
      if (clientId) await removeClient(clientId);
      await removeClient(foreignClientId);
      await prisma.client.agency.deleteMany({ where: { id: foreignAgencyId } });
    }
  });

  it("normalizes client contact data and rejects invalid or duplicate profiles", async () => {
    const tag = crypto.randomUUID();
    let clientId = "";
    try {
      await request(app.getHttpServer()).post("/api/clients").send({ name: `  ${tag} `, primaryContactName: "A. Mohamed", website: "www.example.lk" }).expect(201).then((response) => {
        clientId = response.body.data.id;
        expect(response.body.data.name).toBe(tag);
        expect(response.body.data.website).toBe("https://www.example.lk");
      });
      await request(app.getHttpServer()).post("/api/clients").send({ name: ` ${tag.toUpperCase()} `, primaryContactName: "Anne-Marie", primaryEmail: "unique@example.invalid" }).expect(409);
      await request(app.getHttpServer()).post("/api/clients").send({ name: `Invalid ${tag}`, primaryContactName: "A.", primaryEmail: "not-an-email" }).expect(400);
      await request(app.getHttpServer()).post("/api/clients").send({ name: `No contact ${tag}`, primaryContactName: "Valid Name" }).expect(400);
      await request(app.getHttpServer()).post("/api/clients").send({ name: `Bad phone ${tag}`, primaryContactName: "Valid Name", primaryPhone: "+1234" }).expect(400);
      const normalizedEmail = await request(app.getHttpServer()).post("/api/clients").send({ name: `Email ${tag}`, primaryContactName: "O'Neil-Smith", primaryEmail: "  PERSON@EXAMPLE.INVALID  " }).expect(201);
      expect(normalizedEmail.body.data.primaryEmail).toBe("person@example.invalid");
      const normalizedPhone = await request(app.getHttpServer()).post("/api/clients").send({ name: `Phone ${tag}`, primaryContactName: "QA Caller", primaryPhone: "+12133734253" }).expect(201);
      expect(normalizedPhone.body.data.primaryPhone).toBe("+12133734253");
      await request(app.getHttpServer()).post(`/api/clients/${clientId}/requirements`).send({ expectedTimeline: "0 weeks" }).expect(400);
      await request(app.getHttpServer()).post(`/api/clients/${clientId}/requirements`).send({ targetDate: "2020-01-01" }).expect(400);
      await request(app.getHttpServer()).post(`/api/clients/${clientId}/requirements`).send({ currency: "XYZ" }).expect(400);
      await prisma.client.auditLog.deleteMany({ where: { clientId: normalizedPhone.body.data.id } });
      await prisma.client.client.deleteMany({ where: { id: normalizedPhone.body.data.id } });
      await prisma.client.auditLog.deleteMany({ where: { clientId: normalizedEmail.body.data.id } });
      await prisma.client.client.deleteMany({ where: { id: normalizedEmail.body.data.id } });
    } finally {
      if (clientId) await prisma.client.auditLog.deleteMany({ where: { clientId } });
      if (clientId) await prisma.client.client.deleteMany({ where: { id: clientId } });
    }
  });

  it("creates a client and requirement, confirms a versioned snapshot, and blocks overwrites", async () => {
    const tag = `e2e-${crypto.randomUUID()}`;
    let clientId = ""; let requirementId = "";
    try {
      const client = await request(app.getHttpServer()).post("/api/clients").send({ name: `Integration ${tag}`, primaryContactName: "A. QA Tester", primaryEmail: `qa-${tag}@example.invalid` }).expect(201);
      clientId = client.body.data.id;
      const clientUpdate = await request(app.getHttpServer()).patch(`/api/clients/${clientId}`).send({ primaryContactName: "Test Contact" });
      if (clientUpdate.status !== 200) throw new Error(`Client update failed (${clientUpdate.status}): ${JSON.stringify(clientUpdate.body)}`);
      const searched = await request(app.getHttpServer()).get("/api/clients").query({ search: tag, page: 1, limit: 1 }).expect(200);
      expect(searched.body.data.items.map((row: { id: string }) => row.id)).toEqual([clientId]);
      const firstPage = await request(app.getHttpServer()).get("/api/clients").query({ page: 1, limit: 1 }).expect(200);
      const secondPage = await request(app.getHttpServer()).get("/api/clients").query({ page: 2, limit: 1 }).expect(200);
      expect(firstPage.body.data.items).toHaveLength(1);
      expect(secondPage.body.data.items).toHaveLength(1);
      expect(secondPage.body.data.items[0].id).not.toBe(firstPage.body.data.items[0].id);
      await request(app.getHttpServer()).post("/api/clients").send({ name: "Invalid tenant claim", agencyId: "foreign-agency" }).expect(400);
      const created = await request(app.getHttpServer()).post(`/api/clients/${clientId}/requirements`).send({ title: "Website refresh", businessObjective: "Improve qualified leads for the client", requestedServices: ["Web Development", "UI/UX Design"], items: [{ title: "Landing page", description: "Create a responsive landing page for the service", requirementType: "FUNCTIONAL", itemStatus: "PENDING", priority: "HIGH", sortOrder: 0 }, { title: "Contact form", description: "Collect customer enquiries with validation", requirementType: "FUNCTIONAL", itemStatus: "PENDING", priority: "NORMAL", sortOrder: 1 }] });
      if (created.status !== 201) throw new Error(`Requirement create failed (${created.status}): ${JSON.stringify(created.body)}`);
      requirementId = created.body.data.id;
      expect(created.body.data.items).toHaveLength(2);
      await request(app.getHttpServer()).get(`/api/requirements/${requirementId}/export`).expect(409);
      await request(app.getHttpServer()).patch(`/api/requirements/${requirementId}/status`).send({ status: "CONFIRMED" }).expect(409);
      const ordered = await request(app.getHttpServer()).patch(`/api/requirements/${requirementId}`).send({ items: [{ id: created.body.data.items[1].id, title: "Contact form", description: "Collect customer enquiries with validation", requirementType: "FUNCTIONAL", itemStatus: "PENDING", priority: "NORMAL", sortOrder: 0 }, { id: created.body.data.items[0].id, title: "Landing page", description: "Create a responsive landing page for the service", requirementType: "FUNCTIONAL", itemStatus: "PENDING", priority: "HIGH", sortOrder: 1 }] }).expect(200);
      expect(ordered.body.data.items.map((item: { title: string }) => item.title)).toEqual(["Contact form", "Landing page"]);
      await request(app.getHttpServer()).patch(`/api/requirements/${requirementId}/status`).send({ status: "UNDER_REVIEW" }).expect(200);
      const confirmed = await request(app.getHttpServer()).patch(`/api/requirements/${requirementId}/status`).send({ status: "CONFIRMED" }).expect(200);
      expect(confirmed.body.data.confirmedAt).toBeTruthy();
      const exported = await request(app.getHttpServer()).get(`/api/requirements/${requirementId}/export`).expect(200);
      expect(exported.body.data.approvedVersion).toBe(1);
      expect(exported.body.data.requirement.items).toHaveLength(2);
      expect(exported.body.data.requirement.title).toBe("Website refresh");
      await request(app.getHttpServer()).patch(`/api/requirements/${requirementId}`).send({ title: "Silent overwrite" }).expect(409);
      await request(app.getHttpServer()).patch(`/api/requirements/${requirementId}/status`).send({ status: "CHANGES_REQUESTED", reason: "Clarify the service scope" }).expect(200);
      await request(app.getHttpServer()).patch(`/api/requirements/${requirementId}`).send({ title: "Website refresh, revised scope", changeReason: "Client requested clearer scope", items: [{ id: created.body.data.items[1].id, title: "Contact form", description: "Collect customer enquiries with validation", requirementType: "FUNCTIONAL", itemStatus: "PENDING", priority: "NORMAL", sortOrder: 0 }, { id: created.body.data.items[0].id, title: "Landing page", description: "Create a responsive landing page for the service", requirementType: "FUNCTIONAL", itemStatus: "PENDING", priority: "HIGH", sortOrder: 1 }] }).expect(200);
      await request(app.getHttpServer()).patch(`/api/requirements/${requirementId}/status`).send({ status: "UNDER_REVIEW" }).expect(200);
      const reconfirmed = await request(app.getHttpServer()).patch(`/api/requirements/${requirementId}/status`).send({ status: "CONFIRMED", reason: "Approved revised service scope" }).expect(200);
      expect(reconfirmed.body.data.revisions.map((revision: { version: number }) => revision.version)).toEqual([2, 1]);
      expect((reconfirmed.body.data.revisions[1].contentSnapshot as { title: string }).title).toBe("Website refresh");
      const revisedExport = await request(app.getHttpServer()).get(`/api/requirements/${requirementId}/export`).expect(200);
      expect(revisedExport.body.data.approvedVersion).toBe(2);
      expect((revisedExport.body.data.requirement as { title: string }).title).toBe("Website refresh, revised scope");
    } finally {
      if (clientId) await prisma.client.auditLog.deleteMany({ where: { clientId } });
      if (requirementId) await removeRequirement(requirementId);
      if (clientId) await prisma.client.client.deleteMany({ where: { id: clientId } });
    }
  });

  async function removeRequirement(requirementId: string) {
    await prisma.client.auditLog.deleteMany({ where: { requirementId } });
    await prisma.client.requirementRevision.deleteMany({ where: { requirementId } });
    await prisma.client.requirementReference.deleteMany({ where: { requirementId } });
    await prisma.client.requirementItem.deleteMany({ where: { requirementId } });
    await prisma.client.clientRequirement.deleteMany({ where: { id: requirementId } });
  }

  async function removeClient(clientId: string) {
    const requirements = await prisma.client.clientRequirement.findMany({ where: { clientId }, select: { id: true } });
    for (const requirement of requirements) await removeRequirement(requirement.id);
    await prisma.client.clientAsset.deleteMany({ where: { clientId } });
    await prisma.client.clientCommunication.deleteMany({ where: { clientId } });
    await prisma.client.clientNote.deleteMany({ where: { clientId } });
    await prisma.client.auditLog.deleteMany({ where: { clientId } });
    await prisma.client.client.deleteMany({ where: { id: clientId } });
  }

  it("does not expose another agency client or allow linking a requirement to it", async () => {
    const agencyId = crypto.randomUUID(); const clientId = crypto.randomUUID(); const tag = crypto.randomUUID();
    try {
      await prisma.client.agency.create({ data: { id: agencyId, name: `E2E isolation ${tag}` } });
      await prisma.client.client.create({ data: { id: clientId, agencyId, name: `Foreign ${tag}`, primaryContactName: "Foreign Tester", primaryEmail: `foreign-${tag}@example.invalid` } });
      await request(app.getHttpServer()).get(`/api/clients/${clientId}`).expect(404);
      await request(app.getHttpServer()).post(`/api/clients/${clientId}/requirements`).send({ title: "Foreign link", businessObjective: "Must be rejected" }).expect(404);
    } finally {
      await prisma.client.client.deleteMany({ where: { id: clientId, agencyId } });
      await prisma.client.agency.deleteMany({ where: { id: agencyId } });
    }
  });
});
