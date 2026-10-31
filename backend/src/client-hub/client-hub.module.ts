import { Module } from "@nestjs/common";
import { ClientHubController } from "./client-hub.controller";
import { ClientHubService } from "./client-hub.service";

@Module({ controllers: [ClientHubController], providers: [ClientHubService] })
export class ClientHubModule {}
