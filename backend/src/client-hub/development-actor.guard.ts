import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import type { AuthenticatedRequest } from "../common/auth/agency-context";
import { ClientHubService } from "./client-hub.service";

/** Local-only identity adapter. Production requests require replacing this with the JWT guard. */
@Injectable()
export class DevelopmentActorGuard implements CanActivate {
  constructor(private readonly clients: ClientHubService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.actor = await this.clients.actorForDevelopment();
    return true;
  }
}
