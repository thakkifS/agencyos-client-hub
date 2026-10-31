import { ConflictException, ForbiddenException } from "@nestjs/common";
import { ClientHubService } from "./client-hub.service";
import { PrismaService } from "../prisma/prisma.service";

describe("ClientHubService authorization and workflow", () => {
  const agencyId = "agency-a";
  const userId = "user-a";
  const findRequirement = jest.fn();
  const prisma = { client: { clientRequirement: { findFirst: findRequirement } } } as unknown as PrismaService;
  const config = { get: jest.fn() } as never;
  const service = new ClientHubService(prisma, config);
  const actor = (permissions: string[] = []) => ({ agencyId, userId, permissions });

  beforeEach(() => jest.clearAllMocks());

  it("queries requirements inside the authenticated agency", async () => {
    findRequirement.mockResolvedValue(null);
    await expect(service.requirement(actor(), "foreign-id")).rejects.toMatchObject({ status: 404 });
    expect(findRequirement).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "foreign-id", agencyId } }));
  });

  it("refuses confirmation when the actor lacks the permission", async () => {
    findRequirement.mockResolvedValue({ id: "req", agencyId, status: "UNDER_REVIEW" });
    await expect(service.transition(actor(), "req", "CONFIRMED")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects a transition out of the terminal archived status", async () => {
    findRequirement.mockResolvedValue({ id: "req", agencyId, status: "ARCHIVED" });
    await expect(service.transition(actor(["requirements:confirm"]), "req", "DRAFT")).rejects.toBeInstanceOf(ConflictException);
  });

  it("does not update confirmed requirement content through the ordinary edit route", async () => {
    findRequirement.mockResolvedValue({ id: "req", agencyId, status: "CONFIRMED" });
    await expect(service.updateRequirement(actor(["requirements:manage"]), "req", { title: "Overwrite" })).rejects.toMatchObject({ status: 409 });
  });
});
