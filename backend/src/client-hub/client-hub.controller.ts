import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentActor } from "../common/auth/agency-context";
import type { AgencyActor } from "../common/auth/agency-context";
import { DevelopmentActorGuard } from "./development-actor.guard";
import { ClientDto, ClientQueryDto, RequirementDto, StatusDto, UpdateClientDto, UpdateRequirementDto } from "./client-hub.dto";
import { ClientHubService } from "./client-hub.service";

@Controller()
@UseGuards(DevelopmentActorGuard)
export class ClientHubController {
  constructor(private readonly service: ClientHubService) {}
  @Get("clients/capabilities") capabilities() { return this.service.capabilities(); }
  @Get("clients") list(@CurrentActor() actor: AgencyActor, @Query() query: ClientQueryDto) { return this.service.listClients(actor, query); }
  @Post("clients") create(@CurrentActor() actor: AgencyActor, @Body() dto: ClientDto) { return this.service.createClient(actor, dto); }
  @Get("clients/:id/hub") hub(@CurrentActor() actor: AgencyActor, @Param("id", ParseUUIDPipe) id: string) { return this.service.hub(actor, id); }
  @Get("clients/:id/requirements") requirements(@CurrentActor() actor: AgencyActor, @Param("id", ParseUUIDPipe) id: string) { return this.service.requirements(actor, id); }
  @Post("clients/:id/requirements") createRequirement(@CurrentActor() actor: AgencyActor, @Param("id", ParseUUIDPipe) id: string, @Body() dto: RequirementDto) { return this.service.createRequirement(actor, id, dto); }
  @Get("clients/:id") client(@CurrentActor() actor: AgencyActor, @Param("id", ParseUUIDPipe) id: string) { return this.service.client(actor, id); }
  @Patch("clients/:id") updateClient(@CurrentActor() actor: AgencyActor, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateClientDto) { return this.service.updateClient(actor, id, { ...dto }); }
  @Get("requirements/:id/export") export(@CurrentActor() actor: AgencyActor, @Param("id", ParseUUIDPipe) id: string) { return this.service.exportConfirmed(actor, id); }
  @Get("requirements/:id") requirement(@CurrentActor() actor: AgencyActor, @Param("id", ParseUUIDPipe) id: string) { return this.service.requirement(actor, id); }
  @Patch("requirements/:id/status") status(@CurrentActor() actor: AgencyActor, @Param("id", ParseUUIDPipe) id: string, @Body() dto: StatusDto) { return this.service.transition(actor, id, dto.status, dto.reason); }
  @Patch("requirements/:id") updateRequirement(@CurrentActor() actor: AgencyActor, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateRequirementDto) { return this.service.updateRequirement(actor, id, dto); }
}
