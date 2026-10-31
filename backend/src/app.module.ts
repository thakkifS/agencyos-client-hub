import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ClientHubModule } from "./client-hub/client-hub.module";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  // Prisma stays dormant when DATABASE_URL is unset; health remains a liveness check.
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, HealthModule, ClientHubModule],
})
export class AppModule {}
