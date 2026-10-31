import { SetMetadata, createParamDecorator, ExecutionContext, ForbiddenException, Injectable, CanActivate } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedRequest } from "./agency-context";

export const REQUIRED_PERMISSIONS = "required_permissions";
export const RequirePermissions = (...permissions: string[]) => SetMetadata(REQUIRED_PERMISSIONS, permissions);

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS, [context.getHandler(), context.getClass()]) ?? [];
    if (!required.length) return true;
    const actor = context.switchToHttp().getRequest<AuthenticatedRequest>().actor;
    if (!actor || !required.every((permission) => actor.permissions.includes(permission))) throw new ForbiddenException("Required permission is missing");
    return true;
  }
}

export const CurrentPermissions = createParamDecorator((_data: unknown, context: ExecutionContext) =>
  context.switchToHttp().getRequest<AuthenticatedRequest>().actor?.permissions ?? [],
);
