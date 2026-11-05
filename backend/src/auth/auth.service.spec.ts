import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { CryptoService } from "../common/auth/crypto.service";
import type { PrismaService } from "../prisma/prisma.service";

describe("AuthService & CryptoService", () => {
  let authService: AuthService;
  let cryptoService: CryptoService;
  let mockPrisma: any;
  let configService: ConfigService;

  beforeEach(() => {
    configService = new ConfigService({
      JWT_SECRET: "test-secret-32-chars-long-agencyos-test",
      JWT_EXPIRES_IN_SECONDS: "3600",
      GOOGLE_CLIENT_ID: "test-google-client-id",
      GOOGLE_CLIENT_SECRET: "test-google-client-secret",
      FRONTEND_ORIGIN: "http://localhost:3000",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    });

    cryptoService = new CryptoService(configService);

    mockPrisma = {
      client: {
        user: {
          findFirst: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
        },
      },
    };

    authService = new AuthService(
      mockPrisma as unknown as PrismaService,
      cryptoService,
      configService
    );
  });

  describe("Password Hashing & Verification", () => {
    it("should hash a password with random salt and verify it successfully", () => {
      const password = "AgencyOS@Secure2026!";
      const hash = cryptoService.hashPassword(password);
      expect(hash.startsWith("scrypt:")).toBe(true);

      const isValid = cryptoService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it("should reject an incorrect password", () => {
      const password = "AgencyOS@Secure2026!";
      const hash = cryptoService.hashPassword(password);

      const isValid = cryptoService.verifyPassword("WrongPassword123!", hash);
      expect(isValid).toBe(false);
    });
  });

  describe("JWT Token Handling", () => {
    it("should sign and verify a JWT payload accurately", () => {
      const payload = {
        sub: "user-uuid-1",
        email: "dev@neirah.local",
        name: "Admin User",
        agencyId: "agency-uuid-1",
        agencyName: "Neirah Tech",
        role: "Admin",
        permissions: ["clients:manage", "requirements:manage"],
      };

      const token = cryptoService.signJwt(payload);
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3);

      const verified = cryptoService.verifyJwt(token);
      expect(verified).not.toBeNull();
      expect(verified?.sub).toBe(payload.sub);
      expect(verified?.email).toBe(payload.email);
      expect(verified?.permissions).toEqual(payload.permissions);
    });

    it("should reject a tampered JWT token", () => {
      const token = cryptoService.signJwt({
        sub: "user-uuid-1",
        email: "dev@neirah.local",
        name: "Admin User",
        agencyId: "agency-uuid-1",
        agencyName: "Neirah Tech",
        permissions: [],
      });

      const parts = token.split(".");
      const tampered = `${parts[0]}.${parts[1]}tampered.${parts[2]}`;
      expect(cryptoService.verifyJwt(tampered)).toBeNull();
    });
  });

  describe("Email & Password Login", () => {
    const rawPassword = "AgencyOS@2026!";
    const hashedPassword = new CryptoService(new ConfigService()).hashPassword(rawPassword);

    const mockUser = {
      id: "u-123",
      email: "dev@neirah.local",
      name: "Dev User",
      passwordHash: hashedPassword,
      isActive: true,
      agencyId: "a-123",
      agency: { name: "Neirah Tech" },
      role: {
        name: "Development Admin",
        permissions: [{ key: "clients:manage" }],
      },
    };

    it("should authenticate valid credentials and return user profile + token", async () => {
      mockPrisma.client.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.client.user.update.mockResolvedValue({ ...mockUser, lastLoginAt: new Date() });

      const result = await authService.login(
        { email: "dev@neirah.local", password: rawPassword },
        "127.0.0.1"
      );

      expect(result.user.email).toBe("dev@neirah.local");
      expect(result.user.agencyName).toBe("Neirah Tech");
      expect(result.token).toBeDefined();
      expect(mockPrisma.client.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "u-123" } })
      );
    });

    it("should throw UnauthorizedException on wrong password without exposing internal state", async () => {
      mockPrisma.client.user.findFirst.mockResolvedValue(mockUser);

      await expect(
        authService.login(
          { email: "dev@neirah.local", password: "IncorrectPassword" },
          "127.0.0.1"
        )
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException for an unknown user without revealing existence", async () => {
      mockPrisma.client.user.findFirst.mockResolvedValue(null);

      await expect(
        authService.login(
          { email: "unknown@neirah.local", password: rawPassword },
          "127.0.0.1"
        )
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should block a disabled user account", async () => {
      mockPrisma.client.user.findFirst.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(
        authService.login(
          { email: "dev@neirah.local", password: rawPassword },
          "127.0.0.1"
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it("should trigger rate limiting after 5 consecutive failures", async () => {
      mockPrisma.client.user.findFirst.mockResolvedValue(null);

      const ip = "192.168.1.50";
      const email = "bruteforce@test.local";

      for (let i = 0; i < 5; i++) {
        await expect(
          authService.login({ email, password: "bad" }, ip)
        ).rejects.toThrow(UnauthorizedException);
      }

      // 6th attempt should be blocked by rate limiter
      await expect(
        authService.login({ email, password: "bad" }, ip)
      ).rejects.toThrow(/Too many failed login attempts/);
    });
  });

  describe("Google OAuth URL", () => {
    it("should return a valid Google OAuth authorization URL when configured", () => {
      const result = authService.getGoogleAuthUrl();
      expect(result.configured).toBe(true);
      expect(result.url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
      expect(result.url).toContain("client_id=test-google-client-id");
      expect(result.url).toContain("response_type=code");
    });

    it("should report non-configured status when client ID is missing", () => {
      const unconfiguredService = new AuthService(
        mockPrisma,
        cryptoService,
        new ConfigService({})
      );
      const result = unconfiguredService.getGoogleAuthUrl();
      expect(result.configured).toBe(false);
      expect(result.message).toContain("Google OAuth is not configured");
    });
  });
});

