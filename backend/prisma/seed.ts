import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

if (process.env.NODE_ENV === "production") {
  throw new Error("The development seed is disabled in production");
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  }).toString("hex");
  return `scrypt:${salt}:${derivedKey}`;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const devEmail = process.env.DEV_ACTOR_EMAIL;
  const devPassword = process.env.DEV_ACTOR_PASSWORD;
  if (!databaseUrl || !devEmail || !devPassword) {
    throw new Error(
      "Set DATABASE_URL, DEV_ACTOR_EMAIL, and DEV_ACTOR_PASSWORD before running the development seed"
    );
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
  try {
    const agencyId = "a8b9a002-4f48-44b3-9b22-289b2f2f1a01";
    const agency = await prisma.agency.upsert({
      where: { id: agencyId },
      update: {},
      create: { id: agencyId, name: "Neirah Tech (Development)" },
    });
    const role = await prisma.role.upsert({
      where: { agencyId_name: { agencyId: agency.id, name: "Development Admin" } },
      update: {},
      create: { agencyId: agency.id, name: "Development Admin" },
    });
    const keys = [
      "users:manage",
      "requirements:confirm",
      "requirements:manage",
      "clients:manage",
      "communications:manage",
      "files:manage",
    ];
    await prisma.role.update({
      where: { id: role.id },
      data: {
        permissions: {
          connectOrCreate: keys.map((key) => ({
            where: { key },
            create: { key },
          })),
        },
      },
    });

    const defaultPasswordHash = hashPassword(devPassword);

    await prisma.user.upsert({
      where: { agencyId_email: { agencyId: agency.id, email: devEmail } },
      update: {
        roleId: role.id,
        passwordHash: defaultPasswordHash,
        isActive: true,
      },
      create: {
        agencyId: agency.id,
        roleId: role.id,
        email: devEmail,
        name: "Local Development User",
        passwordHash: defaultPasswordHash,
        isActive: true,
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
void main();
