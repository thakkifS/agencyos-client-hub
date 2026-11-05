import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { CryptoService } from "../common/auth/crypto.service";
import { LoginDto, GoogleCallbackQueryDto } from "./dto/auth.dto";
import { CurrentActor, CurrentUser, type AgencyActor, type AuthenticatedUser } from "../common/auth/agency-context";
import { JwtAuthGuard } from "../common/auth/jwt-auth.guard";
import { CreateUserDto, SignupDto } from "./dto/auth.dto";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly crypto: CryptoService,
    private readonly config: ConfigService
  ) {}

  @Post("signup")
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() dto: SignupDto, @Ip() ip: string, @Res({ passthrough: true }) res: Response) {
    const { token, ...result } = await this.authService.signup(dto, ip);
    res.setHeader("Set-Cookie", this.crypto.createSessionCookie(token));
    return result;
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response
  ) {
    const { token, ...result } = await this.authService.login(dto, ip);
    const cookie = this.crypto.createSessionCookie(token);
    res.setHeader("Set-Cookie", cookie);
    return result;
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    const clearCookie = this.crypto.createClearSessionCookie();
    res.setHeader("Set-Cookie", clearCookie);
    return { success: true, message: "Logged out successfully." };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return { user };
  }

  @Post("users")
  @UseGuards(JwtAuthGuard)
  async createUser(@CurrentActor() actor: AgencyActor, @Body() dto: CreateUserDto) {
    return { user: await this.authService.createUser(actor, dto) };
  }

  @Get("google")
  getGoogleAuthUrl() {
    return this.authService.getGoogleAuthUrl();
  }

  @Get("google/callback")
  async handleGoogleCallback(
    @Query() query: GoogleCallbackQueryDto,
    @Res() res: Response
  ): Promise<void> {
    const frontendOrigin = this.config.get<string>("FRONTEND_ORIGIN") || "http://localhost:3000";
    try {
      const { token } = await this.authService.handleGoogleCallback(query.code, query.state);
      res.setHeader("Set-Cookie", this.crypto.createSessionCookie(token));
      res.redirect(`${frontendOrigin}/overview`);
    } catch {
      res.redirect(`${frontendOrigin}/login?error=google_auth_failed`);
    }
  }
}

