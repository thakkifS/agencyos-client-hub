import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { CryptoService, type JwtPayload } from "../common/auth/crypto.service";
import type { CreateUserDto, LoginDto, SignupDto, UserProfileDto } from "./dto/auth.dto";
import type { AgencyActor, AuthenticatedUser } from "../common/auth/agency-context";

type AttemptRecord = { count: number; lockedUntil?: number };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly signupAttempts = new Map<string, { count: number; resetAt: number }>();
  // IP / email brute-force tracking
  private readonly failedAttempts = new Map<string, AttemptRecord>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly config: ConfigService
  ) {}

  private checkBruteForce(key: string) {
    const record = this.failedAttempts.get(key);
    if (!record) return;

    const now = Date.now();
    if (record.lockedUntil && record.lockedUntil > now) {
      const waitMinutes = Math.ceil((record.lockedUntil - now) / 60000);
      throw new UnauthorizedException(
        `Too many failed login attempts. Please try again in ${waitMinutes} minute(s).`
      );
    }
  }

  private recordFailedAttempt(key: string) {
    const record = this.failedAttempts.get(key) || { count: 0 };
    record.count += 1;
    if (record.count >= 5) {
      // Lock for 15 minutes
      record.lockedUntil = Date.now() + 15 * 60 * 1000;
    }
    this.failedAttempts.set(key, record);
  }

  private clearFailedAttempts(key: string) {
    this.failedAttempts.delete(key);
  }

  private async accountDatabase<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException || error instanceof UnauthorizedException || error instanceof ServiceUnavailableException) throw error;
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
      this.logger.error(`Account database operation failed (Prisma ${code}).`);
      throw new ServiceUnavailableException(
        code === "P2021" || code === "P2022"
          ? "The database schema is missing required tables or authentication fields. Run the pending Prisma migrations and restart the API."
          : "The account service is temporarily unavailable. Check the database connection and apply pending migrations."
      );
    }
  }

  async login(
    dto: LoginDto,
    clientIp = "unknown"
  ): Promise<{ user: UserProfileDto; token: string }> {
    if (!this.config.get<string>("DATABASE_URL")) {
      throw new ServiceUnavailableException("Sign in is temporarily unavailable because the account service is not connected. Please contact your administrator.");
    }
    const rateLimitKey = `${clientIp}:${dto.email}`;
    this.checkBruteForce(rateLimitKey);

    const user = await this.accountDatabase(() => this.prisma.client.user.findFirst({
      where: { email: dto.email },
      include: {
        agency: true,
        role: { include: { permissions: true } },
      },
    }));

    // Timing-attack mitigation: if user does not exist or has no password hash,
    // run a dummy verification to burn comparable CPU cycles
    if (!user || !user.passwordHash) {
      this.crypto.verifyPassword(
        dto.password,
        "scrypt:00000000000000000000000000000000:00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
      );
      this.recordFailedAttempt(rateLimitKey);
      throw new UnauthorizedException("Invalid email or password.");
    }

    const isMatch = this.crypto.verifyPassword(dto.password, user.passwordHash);
    if (!isMatch) {
      this.recordFailedAttempt(rateLimitKey);
      throw new UnauthorizedException("Invalid email or password.");
    }

    if (!user.isActive) {
      throw new ForbiddenException(
        "This account is disabled. Please contact your agency administrator."
      );
    }

    this.clearFailedAttempts(rateLimitKey);

    // Update last login timestamp
    const now = new Date();
    await this.accountDatabase(() => this.prisma.client.user.update({
      where: { id: user.id },
      data: { lastLoginAt: now },
    }));

    const permissions = user.role?.permissions.map((p) => p.key) ?? [];
    const token = this.crypto.signJwt({
      sub: user.id,
      email: user.email,
      name: user.name,
      agencyId: user.agencyId,
      agencyName: user.agency.name,
      role: user.role?.name ?? "User",
      permissions,
    });

    const userProfile: UserProfileDto = {
      id: user.id,
      email: user.email,
      name: user.name,
      agencyId: user.agencyId,
      agencyName: user.agency.name,
      role: user.role?.name ?? "User",
      permissions,
      avatarUrl: user.avatarUrl,
      lastLoginAt: now.toISOString(),
    };

    return { user: userProfile, token };
  }

  async signup(dto: SignupDto, clientIp = "unknown"): Promise<{ user: UserProfileDto; token: string }> {
    const nowMs = Date.now();
    const attempts = this.signupAttempts.get(clientIp);
    if (attempts && attempts.resetAt > nowMs && attempts.count >= 5) {
      throw new ForbiddenException("Too many workspace registrations from this connection. Please try again later.");
    }
    if (!attempts || attempts.resetAt <= nowMs) this.signupAttempts.set(clientIp, { count: 1, resetAt: nowMs + 60 * 60 * 1000 });
    else attempts.count += 1;
    if (!this.config.get<string>("DATABASE_URL")) {
      throw new ServiceUnavailableException("The account service is not connected.");
    }
    const email = dto.email.trim().toLowerCase();
    const existing = await this.accountDatabase(() => this.prisma.client.user.findFirst({ where: { email }, select: { id: true } }));
    if (existing) throw new BadRequestException("An account with this email already exists.");
    const permissionKeys = ["users:manage", "requirements:confirm", "requirements:manage", "clients:manage", "communications:manage", "files:manage"];
    const now = new Date();
    const result = await this.accountDatabase(() => this.prisma.client.$transaction(async (tx) => {
      const agency = await tx.agency.create({ data: { name: dto.agencyName.trim() } });
      const permissions = await Promise.all(permissionKeys.map((key) => tx.permission.upsert({ where: { key }, update: {}, create: { key } })));
      await tx.role.create({ data: { agencyId: agency.id, name: "Member" } });
      const role = await tx.role.create({ data: { agencyId: agency.id, name: "Owner", permissions: { connect: permissions.map(({ id }) => ({ id })) } } });
      const user = await tx.user.create({ data: { agencyId: agency.id, roleId: role.id, email, name: dto.name.trim(), passwordHash: this.crypto.hashPassword(dto.password), lastLoginAt: now } });
      await tx.auditLog.create({ data: { agencyId: agency.id, actorId: user.id, action: "AGENCY_CREATED", entityType: "Agency", entityId: agency.id, metadata: { source: "self-service-signup" } } });
      return { agency, role, user, permissions };
    }));
    const keys = result.permissions.map(({ key }) => key);
    const userProfile: UserProfileDto = { id: result.user.id, email, name: result.user.name, agencyId: result.agency.id, agencyName: result.agency.name, role: result.role.name, permissions: keys, avatarUrl: null, lastLoginAt: now.toISOString() };
    const token = this.crypto.signJwt({ sub: userProfile.id, email, name: userProfile.name, agencyId: userProfile.agencyId, agencyName: userProfile.agencyName, role: userProfile.role, permissions: keys });
    return { user: userProfile, token };
  }

  async verifyToken(token: string): Promise<{ actor: AgencyActor; user: AuthenticatedUser }> {
    if (!this.config.get<string>("DATABASE_URL")) {
      throw new ServiceUnavailableException("The account service is not connected.");
    }
    const payload = this.crypto.verifyJwt(token);
    if (!payload) {
      throw new UnauthorizedException("Invalid or expired session token.");
    }

    const user = await this.accountDatabase(() => this.prisma.client.user.findUnique({
      where: { id: payload.sub },
      include: {
        agency: true,
        role: { include: { permissions: true } },
      },
    }));

    if (!user || !user.isActive) {
      throw new UnauthorizedException("User account not found or inactive.");
    }

    const permissions = user.role?.permissions.map((p) => p.key) ?? [];

    const actor: AgencyActor = {
      userId: user.id,
      agencyId: user.agencyId,
      permissions,
    };

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      agencyId: user.agencyId,
      agencyName: user.agency.name,
      role: user.role?.name ?? "User",
      permissions,
      avatarUrl: user.avatarUrl,
    };

    return { actor, user: authenticatedUser };
  }

  async createUser(actor: AgencyActor, dto: CreateUserDto): Promise<UserProfileDto> {
    if (!actor.permissions.includes("users:manage")) {
      throw new ForbiddenException("You do not have permission to create agency users.");
    }
    if (!this.config.get<string>("DATABASE_URL")) {
      throw new ServiceUnavailableException("The account service is not connected.");
    }
    const email = dto.email.trim().toLowerCase();
    const duplicate = await this.accountDatabase(() => this.prisma.client.user.findFirst({ where: { agencyId: actor.agencyId, email }, select: { id: true } }));
    if (duplicate) throw new BadRequestException("A user with this email already exists in your agency.");
    const role = await this.accountDatabase(() => this.prisma.client.role.findFirst({ where: { agencyId: actor.agencyId, name: "Member" }, include: { agency: true } }));
    const passwordHash = this.crypto.hashPassword(dto.password);
    try {
      const user = await this.accountDatabase(() => this.prisma.client.user.create({
        data: { agencyId: actor.agencyId, email, name: dto.name.trim(), passwordHash, roleId: role?.id },
      }));
      return { id: user.id, email: user.email, name: user.name, agencyId: user.agencyId, agencyName: role?.agency.name ?? "", role: role?.name ?? "User", permissions: [], avatarUrl: null, lastLoginAt: null };
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
        throw new BadRequestException("A user with this email already exists in your agency.");
      }
      throw error;
    }
  }

  // --- GOOGLE OAUTH 2.0 / OPENID CONNECT ---

  getGoogleAuthUrl(): { configured: boolean; url?: string; message?: string } {
    const clientId = this.config.get<string>("GOOGLE_CLIENT_ID");
    const backendOrigin = this.config.get<string>("BACKEND_ORIGIN") || `http://localhost:${this.config.get<string>("PORT") || "5000"}`;
    const redirectUri =
      this.config.get<string>("GOOGLE_CALLBACK_URL") ||
      `${backendOrigin}/api/auth/google/callback`;

    if (!clientId || !this.config.get<string>("GOOGLE_CLIENT_SECRET")) return { configured: false, message: "Google sign-in is not configured for this workspace." };

    const nonce = randomBytes(24).toString("base64url");
    const state = this.crypto.signJwt({
      sub: "oauth-state",
      email: nonce,
      name: "OAuth State",
      agencyId: nonce,
      agencyName: "OAuth State",
      permissions: [],
    }, 600);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "select_account",
      state,
    });

    return {
      configured: true,
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    };
  }

  async handleGoogleCallback(
    code: string,
    state?: string
  ): Promise<{ user: UserProfileDto; token: string }> {
    const clientId = this.config.get<string>("GOOGLE_CLIENT_ID");
    const clientSecret = this.config.get<string>("GOOGLE_CLIENT_SECRET");
    const frontendOrigin =
      this.config.get<string>("FRONTEND_ORIGIN") || "http://localhost:3000";
    const backendOrigin = this.config.get<string>("BACKEND_ORIGIN") || `http://localhost:${this.config.get<string>("PORT") || "5000"}`;
    const redirectUri =
      this.config.get<string>("GOOGLE_CALLBACK_URL") ||
      `${backendOrigin}/api/auth/google/callback`;

    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        "Google OAuth credentials are not configured on the server."
      );
    }

    // Verify state token
    if (!state) {
      throw new BadRequestException("OAuth state parameter is required.");
    }
    const statePayload = this.crypto.verifyJwt(state);
    if (!statePayload || statePayload.sub !== "oauth-state" || statePayload.exp === undefined || statePayload.iat === undefined || statePayload.exp - statePayload.iat > 600 || !statePayload.agencyId) {
      throw new BadRequestException("Invalid OAuth state parameter.");
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      this.logger.error(`Google token exchange failed: ${errorText}`);
      throw new UnauthorizedException("Failed to exchange authorization code with Google.");
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      id_token?: string;
    };

    // Retrieve userinfo
    const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userinfoResponse.ok) {
      throw new UnauthorizedException("Failed to fetch user profile from Google.");
    }

    const googleUser = (await userinfoResponse.json()) as {
      sub: string;
      email: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };

    if (!googleUser.email || !googleUser.email_verified) {
      throw new UnauthorizedException("Google account email is unverified or missing.");
    }

    // Find user in PostgreSQL by Google ID or by verified Email
    const normalizedEmail = googleUser.email.toLowerCase().trim();
    const matchedUser = await this.accountDatabase(() => this.prisma.client.user.findFirst({
      where: {
        OR: [{ googleId: googleUser.sub }, { email: normalizedEmail }],
      },
      include: {
        agency: true,
        role: { include: { permissions: true } },
      },
    }));

    if (!matchedUser) {
      throw new ForbiddenException(
        `No agency workspace found for Google account (${normalizedEmail}). Please contact your agency administrator.`
      );
    }

    if (!matchedUser.isActive) {
      throw new ForbiddenException("This user account is disabled.");
    }

    // Update googleId, avatar and lastLogin
    const now = new Date();
    const user = await this.accountDatabase(() => this.prisma.client.user.update({
      where: { id: matchedUser.id },
      data: {
        googleId: googleUser.sub,
        avatarUrl: googleUser.picture ?? matchedUser.avatarUrl,
        lastLoginAt: now,
      },
      include: {
        agency: true,
        role: { include: { permissions: true } },
      },
    }));

    const permissions = user.role?.permissions.map((p) => p.key) ?? [];
    const token = this.crypto.signJwt({
      sub: user.id,
      email: user.email,
      name: user.name,
      agencyId: user.agencyId,
      agencyName: user.agency.name,
      role: user.role?.name ?? "User",
      permissions,
    });

    const userProfile: UserProfileDto = {
      id: user.id,
      email: user.email,
      name: user.name,
      agencyId: user.agencyId,
      agencyName: user.agency.name,
      role: user.role?.name ?? "User",
      permissions,
      avatarUrl: user.avatarUrl,
      lastLoginAt: now.toISOString(),
    };

    return { user: userProfile, token };
  }
}

