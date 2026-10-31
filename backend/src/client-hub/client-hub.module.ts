import { Module } from "@nestjs/common";
import { ClientHubController } from "./client-hub.controller";
import { ClientHubService } from "./client-hub.service";
import { DevelopmentActorGuard } from "./development-actor.guard";
import { ClientCollaborationController } from "./client-collaboration.controller";
import { ClientCollaborationService } from "./client-collaboration.service";
import { LocalAssetStorageService } from "./local-asset-storage.service";

@Module({ controllers: [ClientHubController, ClientCollaborationController], providers: [ClientHubService, ClientCollaborationService, LocalAssetStorageService, DevelopmentActorGuard] })
export class ClientHubModule {}
