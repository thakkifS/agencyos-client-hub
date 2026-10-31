import { Controller, Get } from "@nestjs/common";
import { ClientHubService } from "./client-hub.service";

@Controller("clients")
export class ClientHubController {
  constructor(private readonly clientHubService: ClientHubService) {}

  @Get("capabilities")
  capabilities() {
    return this.clientHubService.capabilities();
  }
}
