import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { createReadStream } from "node:fs";
import type { Response } from "express";
import { CurrentActor } from "../common/auth/agency-context";
import type { AgencyActor } from "../common/auth/agency-context";
import { JwtAuthGuard } from "../common/auth/jwt-auth.guard";
import { AssetQueryDto, CommunicationQueryDto, CreateCommunicationDto, CreateReferenceDto, TimelineQueryDto, UploadClientFileDto } from "./dto/collaboration.dto";
import { ClientCollaborationService } from "./client-collaboration.service";
import type { UploadBufferFile } from "./local-asset-storage.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class ClientCollaborationController {
  constructor(private readonly collaboration: ClientCollaborationService) {}

  @Get("clients/:id/communications") communications(@CurrentActor() actor: AgencyActor, @Param("id", ParseUUIDPipe) id: string, @Query() query: CommunicationQueryDto) { return this.collaboration.communications(actor, id, query); }
  @Post("clients/:id/communications") createCommunication(@CurrentActor() actor: AgencyActor, @Param("id", ParseUUIDPipe) id: string, @Body() dto: CreateCommunicationDto) { return this.collaboration.createCommunication(actor, id, dto); }

  @Get("clients/:id/assets") assets(@CurrentActor() actor: AgencyActor, @Param("id", ParseUUIDPipe) id: string, @Query() query: AssetQueryDto) { return this.collaboration.assets(actor, id, query); }
  @Post("clients/:id/references") createReference(@CurrentActor() actor: AgencyActor, @Param("id", ParseUUIDPipe) id: string, @Body() dto: CreateReferenceDto) { return this.collaboration.createReference(actor, id, dto); }
  @Post("clients/:id/files")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  upload(@CurrentActor() actor: AgencyActor, @Param("id", ParseUUIDPipe) id: string, @UploadedFile() file: UploadBufferFile, @Body() dto: UploadClientFileDto) { return this.collaboration.upload(actor, id, file, dto); }
  @Delete("assets/:assetId") removeAsset(@CurrentActor() actor: AgencyActor, @Param("assetId", ParseUUIDPipe) assetId: string) { return this.collaboration.removeAsset(actor, assetId); }

  @Get("assets/:assetId/download")
  async download(@CurrentActor() actor: AgencyActor, @Param("assetId", ParseUUIDPipe) assetId: string, @Res({ passthrough: true }) response: Response) {
    const file = await this.collaboration.download(actor, assetId);
    const safeName = file.filename.replace(/[\r\n"\\]/g, "_");
    response.setHeader("Content-Disposition", `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(safeName)}`);
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Cache-Control", "private, no-store");
    return new StreamableFile(createReadStream(file.path), { type: file.mimeType, length: file.size ?? undefined });
  }

  @Get("clients/:id/timeline") timeline(@CurrentActor() actor: AgencyActor, @Param("id", ParseUUIDPipe) id: string, @Query() query: TimelineQueryDto) { return this.collaboration.timeline(actor, id, query); }
}
