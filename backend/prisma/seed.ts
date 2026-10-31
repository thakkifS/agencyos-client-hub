import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

if (process.env.NODE_ENV === "production") throw new Error("The development seed is disabled in production");

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const devEmail = process.env.DEV_ACTOR_EMAIL;
  if (!databaseUrl || !devEmail) throw new Error("Set DATABASE_URL and DEV_ACTOR_EMAIL before running the development seed");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    const agencyId = "a8b9a002-4f48-44b3-9b22-289b2f2f1a01";
    const agency = await prisma.agency.upsert({ where: { id: agencyId }, update: {}, create: { id: agencyId, name: "Neirah Tech (Development)" } });
    const role = await prisma.role.upsert({ where: { agencyId_name: { agencyId: agency.id, name: "Development Admin" } }, update: {}, create: { agencyId: agency.id, name: "Development Admin" } });
    const keys = ["requirements:confirm", "requirements:manage", "clients:manage"];
    await prisma.role.update({ where: { id: role.id }, data: { permissions: { connectOrCreate: keys.map((key) => ({ where: { key }, create: { key } })) } } });
    await prisma.user.upsert({ where: { agencyId_email: { agencyId: agency.id, email: devEmail } }, update: { roleId: role.id }, create: { agencyId: agency.id, roleId: role.id, email: devEmail, name: "Local Development User" } });
  } finally {
    await prisma.$disconnect();
  }
}
void main();
