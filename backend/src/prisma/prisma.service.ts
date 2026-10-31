import { Injectable, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly prismaClient: PrismaClient | undefined;

  constructor(config: ConfigService) {
    const connectionString = config.get<string>("DATABASE_URL");
    if (connectionString) {
      this.prismaClient = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    }
  }

  async onModuleInit() {
    if (this.prismaClient) await this.prismaClient.$connect();
  }

  async onModuleDestroy() {
    if (this.prismaClient) await this.prismaClient.$disconnect();
  }

  get client(): PrismaClient {
    if (!this.prismaClient) throw new ServiceUnavailableException("Database is not configured");
    return this.prismaClient;
  }
}
