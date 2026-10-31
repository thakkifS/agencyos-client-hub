import { Module } from "@nestjs/common";
import { ClientHubController } from "./client-hub.controller";
import { ClientHubService } from "./client-hub.service";
import { DevelopmentActorGuard } from "./development-actor.guard";

@Module({ controllers: [ClientHubController], providers: [ClientHubService, DevelopmentActorGuard] })
export class ClientHubModule {}
