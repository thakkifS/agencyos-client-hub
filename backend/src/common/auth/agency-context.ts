import { createParamDecorator, ExecutionContext, ForbiddenException, Injectable, CanActivate, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";

export type AgencyActor = { userId: string; agencyId: string; permissions: string[] };
export type AuthenticatedRequest = Request & { actor?: AgencyActor };

export const CurrentActor = createParamDecorator((_data: unknown, context: ExecutionContext): AgencyActor | undefined =>
  context.switchToHttp().getRequest<AuthenticatedRequest>().actor,
);

/** Requires an actor installed by a future JWT guard; never reads agencyId from query/body input. */
@Injectable()
export class AuthenticatedAgencyGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const actor = context.switchToHttp().getRequest<AuthenticatedRequest>().actor;
    if (!actor?.userId || !actor.agencyId) throw new UnauthorizedException("Authenticated agency context is required");
    return true;
  }
}

export function assertAgencyOwnership(recordAgencyId: string, actor: AgencyActor) {
  if (recordAgencyId !== actor.agencyId) throw new ForbiddenException("Resource does not belong to the authenticated agency");
}
