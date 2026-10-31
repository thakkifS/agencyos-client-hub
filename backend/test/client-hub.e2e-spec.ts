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

  it("creates a client and requirement, confirms a versioned snapshot, and blocks overwrites", async () => {
    const tag = `e2e-${crypto.randomUUID()}`;
    let clientId = ""; let requirementId = "";
    try {
      const client = await request(app.getHttpServer()).post("/api/clients").send({ name: `Integration ${tag}` }).expect(201);
      clientId = client.body.data.id;
      await request(app.getHttpServer()).patch(`/api/clients/${clientId}`).send({ primaryContactName: "Test Contact" }).expect(200);
      const searched = await request(app.getHttpServer()).get("/api/clients").query({ search: tag, page: 1, limit: 1 }).expect(200);
      expect(searched.body.data.items.map((row: { id: string }) => row.id)).toEqual([clientId]);
      const firstPage = await request(app.getHttpServer()).get("/api/clients").query({ page: 1, limit: 1 }).expect(200);
      const secondPage = await request(app.getHttpServer()).get("/api/clients").query({ page: 2, limit: 1 }).expect(200);
      expect(firstPage.body.data.items).toHaveLength(1);
      expect(secondPage.body.data.items).toHaveLength(1);
      expect(secondPage.body.data.items[0].id).not.toBe(firstPage.body.data.items[0].id);
      await request(app.getHttpServer()).post("/api/clients").send({ name: "Invalid tenant claim", agencyId: "foreign-agency" }).expect(400);
      const created = await request(app.getHttpServer()).post(`/api/clients/${clientId}/requirements`).send({ title: "Website refresh", businessObjective: "Improve qualified leads", requestedServices: ["Design", "Development"], items: [{ title: "Landing page", sortOrder: 0 }, { title: "Contact form", sortOrder: 1 }] });
      if (created.status !== 201) throw new Error(`Requirement create failed (${created.status}): ${JSON.stringify(created.body)}`);
      requirementId = created.body.data.id;
      expect(created.body.data.items).toHaveLength(2);
      await request(app.getHttpServer()).get(`/api/requirements/${requirementId}/export`).expect(409);
      await request(app.getHttpServer()).patch(`/api/requirements/${requirementId}/status`).send({ status: "CONFIRMED" }).expect(409);
      const ordered = await request(app.getHttpServer()).patch(`/api/requirements/${requirementId}`).send({ items: [{ id: created.body.data.items[1].id, title: "Contact form", sortOrder: 0 }, { id: created.body.data.items[0].id, title: "Landing page", sortOrder: 1 }] }).expect(200);
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
      await request(app.getHttpServer()).patch(`/api/requirements/${requirementId}`).send({ title: "Website refresh, revised scope", changeReason: "Client requested clearer scope", items: [{ id: created.body.data.items[1].id, title: "Contact form", sortOrder: 0 }, { id: created.body.data.items[0].id, title: "Landing page", sortOrder: 1 }] }).expect(200);
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

  it("does not expose another agency client or allow linking a requirement to it", async () => {
    const agencyId = crypto.randomUUID(); const clientId = crypto.randomUUID(); const tag = crypto.randomUUID();
    try {
      await prisma.client.agency.create({ data: { id: agencyId, name: `E2E isolation ${tag}` } });
      await prisma.client.client.create({ data: { id: clientId, agencyId, name: `Foreign ${tag}` } });
      await request(app.getHttpServer()).get(`/api/clients/${clientId}`).expect(404);
      await request(app.getHttpServer()).post(`/api/clients/${clientId}/requirements`).send({ title: "Foreign link", businessObjective: "Must be rejected" }).expect(404);
    } finally {
      await prisma.client.client.deleteMany({ where: { id: clientId, agencyId } });
      await prisma.client.agency.deleteMany({ where: { id: agencyId } });
    }
  });
});
