import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // The CLI can generate the Prisma client without credentials. Migrations still
  // require a real DATABASE_URL in backend/.env.
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
