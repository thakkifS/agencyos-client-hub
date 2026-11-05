import { Global, Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { CryptoService } from "../common/auth/crypto.service";
import { JwtAuthGuard } from "../common/auth/jwt-auth.guard";
import { PrismaModule } from "../prisma/prisma.module";

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, CryptoService, JwtAuthGuard],
  exports: [AuthService, CryptoService, JwtAuthGuard],
})
export class AuthModule {}

