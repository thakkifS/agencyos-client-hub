import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  CanActivate,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";

export type AgencyActor = {
  userId: string;
  agencyId: string;
  permissions: string[];
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  agencyId: string;
  agencyName: string;
  role?: string;
  permissions: string[];
  avatarUrl?: string | null;
};

export type AuthenticatedRequest = Request & {
  actor?: AgencyActor;
  user?: AuthenticatedUser;
};

export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AgencyActor | undefined =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().actor
);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser | undefined =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user
);

/** Requires an actor installed by the auth guard; never reads agencyId from query/body input. */
@Injectable()
export class AuthenticatedAgencyGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const actor = context.switchToHttp().getRequest<AuthenticatedRequest>().actor;
    if (!actor?.userId || !actor.agencyId) {
      throw new UnauthorizedException("Authenticated agency context is required");
    }
    return true;
  }
}

export function assertAgencyOwnership(recordAgencyId: string, actor: AgencyActor) {
  if (recordAgencyId !== actor.agencyId) {
    throw new ForbiddenException("Resource does not belong to the authenticated agency");
  }
}
