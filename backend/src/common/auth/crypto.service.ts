import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InternalServerErrorException } from "@nestjs/common";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export type JwtPayload = {
  sub: string;
  email: string;
  name: string;
  agencyId: string;
  agencyName: string;
  role?: string;
  permissions: string[];
  iat?: number;
  exp?: number;
};

@Injectable()
export class CryptoService {
  private readonly secret: string;
  private readonly expiresInSeconds: number;

  constructor(private readonly config: ConfigService) {
    const configuredSecret = this.config.get<string>("JWT_SECRET");
    const isProduction = this.config.get<string>("NODE_ENV") === "production";
    if (isProduction && (!configuredSecret || configuredSecret.length < 32)) {
      throw new InternalServerErrorException("JWT_SECRET must contain at least 32 characters in production.");
    }
    this.secret = configuredSecret || "agencyos-dev-jwt-secret-key-do-not-use-in-production-3849102";
    // Default 7 days
    this.expiresInSeconds = Number(
      this.config.get<string>("JWT_EXPIRES_IN_SECONDS") || 7 * 24 * 60 * 60
    );
  }

  // --- PASSWORD HASHING (OWASP recommended memory-hard scrypt) ---

  hashPassword(password: string): string {
    const salt = randomBytes(16).toString("hex");
    const derivedKey = scryptSync(password, salt, 64, {
      N: 16384,
      r: 8,
      p: 1,
    }).toString("hex");
    return `scrypt:${salt}:${derivedKey}`;
  }

  verifyPassword(password: string, storedHash: string): boolean {
    try {
      const parts = storedHash.split(":");
      if (parts.length !== 3 || parts[0] !== "scrypt") {
        return false;
      }
      const salt = parts[1];
      const expectedKey = Buffer.from(parts[2], "hex");
      const derivedKey = scryptSync(password, salt, 64, {
        N: 16384,
        r: 8,
        p: 1,
      });

      if (expectedKey.length !== derivedKey.length) {
        return false;
      }

      return timingSafeEqual(expectedKey, derivedKey);
    } catch {
      return false;
    }
  }

  // --- JSON WEB TOKEN (RFC 7519 HMAC-SHA256, ZERO external dependencies) ---

  signJwt(payload: Omit<JwtPayload, "iat" | "exp">, expiresInSeconds = this.expiresInSeconds): string {
    const now = Math.floor(Date.now() / 1000);
    const fullPayload: JwtPayload = {
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
    };

    const header = { alg: "HS256", typ: "JWT" };
    const headerB64 = this.base64UrlEncode(JSON.stringify(header));
    const payloadB64 = this.base64UrlEncode(JSON.stringify(fullPayload));
    const signature = this.createHmacSha256(`${headerB64}.${payloadB64}`);

    return `${headerB64}.${payloadB64}.${signature}`;
  }

  verifyJwt(token: string): JwtPayload | null {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;

      const [headerB64, payloadB64, signatureB64] = parts;
      const expectedSignature = this.createHmacSha256(`${headerB64}.${payloadB64}`);

      const sigBuffer = Buffer.from(signatureB64);
      const expectedBuffer = Buffer.from(expectedSignature);

      if (sigBuffer.length !== expectedBuffer.length) {
        return null;
      }

      if (!timingSafeEqual(sigBuffer, expectedBuffer)) {
        return null;
      }

      const payloadJson = this.base64UrlDecode(payloadB64);
      const payload = JSON.parse(payloadJson) as JwtPayload;

      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        return null; // Expired
      }

      return payload;
    } catch {
      return null;
    }
  }

  // --- COOKIE HELPERS ---

  parseCookie(cookieHeader?: string, name = "agencyos_session"): string | null {
    if (!cookieHeader) return null;
    const cookies = cookieHeader.split(";").map((c) => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith(`${name}=`)) {
        return decodeURIComponent(cookie.slice(name.length + 1));
      }
    }
    return null;
  }

  createSessionCookie(token: string, maxAge = this.expiresInSeconds): string {
    const isProd = this.config.get<string>("NODE_ENV") === "production";
    const secureFlag = isProd ? "; Secure" : "";
    return `agencyos_session=${encodeURIComponent(
      token
    )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureFlag}`;
  }

  createClearSessionCookie(): string {
    const isProd = this.config.get<string>("NODE_ENV") === "production";
    const secureFlag = isProd ? "; Secure" : "";
    return `agencyos_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secureFlag}`;
  }

  private base64UrlEncode(str: string): string {
    return Buffer.from(str)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  private base64UrlDecode(str: string): string {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    return Buffer.from(base64, "base64").toString("utf8");
  }

  private createHmacSha256(data: string): string {
    return createHmac("sha256", this.secret)
      .update(data)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
}

