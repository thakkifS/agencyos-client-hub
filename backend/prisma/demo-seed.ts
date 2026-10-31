import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

if (process.env.NODE_ENV === "production") throw new Error("Demo seed is disabled in production");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const email = process.env.DEV_ACTOR_EMAIL;
  if (!connectionString || !email) throw new Error("Set DATABASE_URL and DEV_ACTOR_EMAIL in the local environment");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const agencyId = "a8b9a002-4f48-44b3-9b22-289b2f2f1a01";
    const user = await prisma.user.findFirst({ where: { agencyId, email }, select: { id: true } });
    if (!user) throw new Error("Run prisma:seed:dev first; the configured development actor was not found");

    const clients = [
      { id: "b8b9a002-4f48-44b3-9b22-289b2f2f1a01", name: "DEMO · Northstar Coffee", contact: "Maya Fernando", email: "maya@northstar.example" },
      { id: "b8b9a002-4f48-44b3-9b22-289b2f2f1a02", name: "DEMO · Cedar & Finch Studio", contact: "Ishan Perera", email: "ishan@cedarfinch.example" },
      { id: "b8b9a002-4f48-44b3-9b22-289b2f2f1a03", name: "DEMO · Lumen Learning", contact: "Asha Silva", email: "asha@lumenlearning.example" },
    ];
    for (const [index, item] of clients.entries()) {
      const client = await prisma.client.upsert({ where: { id: item.id }, update: {}, create: { id: item.id, agencyId, name: item.name, primaryContactName: item.contact, primaryEmail: item.email, primaryPhone: `+94 11 555 01${index}`, status: index === 0 ? "ACTIVE" : "ONBOARDING" } });
      const requirementId = `c8b9a002-4f48-44b3-9b22-289b2f2f1a0${index + 1}`;
      const status = index === 0 ? "CONFIRMED" : index === 1 ? "UNDER_REVIEW" : "DRAFT";
      const confirmedAt = new Date("2026-10-30T09:00:00.000Z");
      const requirement = await prisma.clientRequirement.upsert({
        where: { id: requirementId }, update: {},
        create: { id: requirementId, agencyId, clientId: client.id, preparedById: user.id, title: ["Website discovery and refresh", "Brand launch landing page", "Course enrolment experience"][index], businessObjective: ["Improve qualified online orders and local discovery.", "Present the new identity and collect launch enquiries.", "Make course information and enrolment easier to use."][index], requestedServices: ["UX research", "Web design", "Development"], designPreferences: "Clear hierarchy, accessible contrast, and a calm editorial feel.", budgetMin: "4500.00", budgetMax: "7000.00", currency: "USD", expectedTimeline: "6–8 weeks", constraints: "Use existing brand assets where suitable.", assumptions: "Content will be supplied by the client.", status, ...(status === "CONFIRMED" ? { confirmedById: user.id, confirmedAt } : {}) },
      });
      const items = ["Discovery and content structure", "Responsive page design", "Accessible contact or enrolment flow"];
      for (const [sortOrder, title] of items.entries()) {
        const itemId = `d8b9a002-4f48-44b3-9b22-289b2f2f1a0${index * 3 + sortOrder + 1}`;
        await prisma.requirementItem.upsert({ where: { id: itemId }, update: {}, create: { id: itemId, agencyId, requirementId: requirement.id, title, description: `Demonstration scope: ${title.toLowerCase()}.`, category: "Web", sortOrder } });
      }
      if (status === "CONFIRMED") {
        const snapshot = { ...requirement, items: await prisma.requirementItem.findMany({ where: { requirementId }, orderBy: { sortOrder: "asc" } }), references: [] };
        await prisma.requirementRevision.upsert({ where: { requirementId_version: { requirementId, version: 1 } }, update: {}, create: { agencyId, requirementId, version: 1, contentSnapshot: JSON.parse(JSON.stringify(snapshot)), confirmedById: user.id, confirmedAt } });
      }
      const commId = `e8b9a002-4f48-44b3-9b22-289b2f2f1a0${index + 1}`;
      await prisma.clientCommunication.upsert({ where: { id: commId }, update: {}, create: { id: commId, agencyId, clientId: client.id, requirementId, createdById: user.id, type: index === 1 ? "MEETING" : "EMAIL", subject: "DEMO · Discovery follow-up", summary: "Fictional demonstration record. Confirmed the next discovery actions.", participants: [item.contact, "Neirah Tech account lead"], occurredAt: new Date(`2026-10-${28 + index}T10:00:00.000Z`), followUpNotes: "DEMO · Share the meeting summary." } });
      const assetId = `f8b9a002-4f48-44b3-9b22-289b2f2f1a0${index + 1}`;
      await prisma.clientAsset.upsert({ where: { id: assetId }, update: {}, create: { id: assetId, agencyId, clientId: client.id, requirementId, type: "REFERENCE", label: "DEMO · Style reference", externalUrl: "https://example.org/agency-os-demo-reference", uploadedById: user.id } });
      const auditId = `a9b9a002-4f48-44b3-9b22-289b2f2f1a0${index + 1}`;
      await prisma.auditLog.upsert({ where: { id: auditId }, update: {}, create: { id: auditId, agencyId, clientId: client.id, requirementId, actorId: user.id, action: status === "CONFIRMED" ? "REQUIREMENT_CONFIRMED" : status === "UNDER_REVIEW" ? "REQUIREMENT_UNDER_REVIEW" : "REQUIREMENT_CREATED", entityType: "ClientRequirement", entityId: requirement.id, eventAt: new Date(`2026-10-${28 + index}T09:00:00.000Z`), metadata: { demonstration: true } } });
    }
    console.log("Development demonstration records are present; existing records were left unchanged.");
  } finally { await prisma.$disconnect(); }
}
void main();
