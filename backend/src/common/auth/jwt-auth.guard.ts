import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AuthenticatedRequest } from "./agency-context";
import { AuthService } from "../../auth/auth.service";
import { CryptoService } from "./crypto.service";
import { PrismaService } from "../../prisma/prisma.service";

const DEVELOPMENT_AGENCY_ID = "a8b9a002-4f48-44b3-9b22-289b2f2f1a01";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  constructor(
    private readonly authService: AuthService,
    private readonly crypto: CryptoService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // 1. Try Bearer token in Authorization header
    let token: string | null = null;
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }

    // 2. Try HttpOnly session cookie
    if (!token && request.headers.cookie) {
      token = this.crypto.parseCookie(request.headers.cookie, "agencyos_session");
    }

    // 3. If token is present, verify it cryptographically and resolve tenant actor
    if (token) {
      try {
        const { actor, user } = await this.authService.verifyToken(token);
        request.actor = actor;
        request.user = user;
        return true;
      } catch (err) {
        if (err instanceof HttpException) throw err;
        throw new UnauthorizedException(
          err instanceof Error ? err.message : "Invalid authentication session"
        );
      }
    }

    // 4. Fallback for automated e2e tests & local development when explicitly enabled
    const enableDevAuth = this.config.get<string>("ENABLE_DEV_AUTH") === "true";
    const isProduction = this.config.get<string>("NODE_ENV") === "production";

    if (enableDevAuth && !isProduction) {
      const email = this.config.get<string>("DEV_ACTOR_EMAIL");
      if (!email) {
        throw new UnauthorizedException("DEV_ACTOR_EMAIL is not configured.");
      }
      let user;
      try {
        user = await this.prisma.client.user.findFirst({
          where: { agencyId: DEVELOPMENT_AGENCY_ID, email },
          include: { agency: true, role: { include: { permissions: true } } },
        });
      } catch (error) {
        const code = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
        this.logger.error(`Development actor lookup failed (Prisma ${code}).`);
        throw new ServiceUnavailableException(
          code === "P2021" || code === "P2022"
            ? "The database schema is missing required tables or authentication fields. Run the pending Prisma migrations and restart the API."
            : "The account database is unavailable. Check its connection and restart the API."
        );
      }
      if (user && user.isActive) {
        const permissions = user.role?.permissions.map((p) => p.key) ?? [];
        request.actor = {
          userId: user.id,
          agencyId: user.agencyId,
          permissions,
        };
        request.user = {
          id: user.id,
          agencyId: user.agencyId,
          name: user.name,
          email: user.email,
          agencyName: user.agency?.name ?? "Neirah Tech (Development)",
          role: user.role?.name ?? "Development Admin",
          permissions,
          avatarUrl: user.avatarUrl,
        };
        return true;
      }
    }

    throw new UnauthorizedException("Authentication required. Please sign in.");
  }
}
