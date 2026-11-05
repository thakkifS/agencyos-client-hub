import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { Transform } from "class-transformer";

export class LoginDto {
  @IsEmail({}, { message: "A valid email address is required" })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value
  )
  email!: string;

  @IsString({ message: "Password must be a string" })
  @IsNotEmpty({ message: "Password is required" })
  @MinLength(6, { message: "Password must be at least 6 characters" })
  @MaxLength(100, { message: "Password cannot exceed 100 characters" })
  password!: string;
}

export class GoogleCallbackQueryDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsOptional()
  @IsString()
  state?: string;
}

export class CreateUserDto {
  @IsEmail({}, { message: "A valid email address is required" })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value
  )
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(12, { message: "Initial password must be at least 12 characters" })
  @MaxLength(100)
  password!: string;
}

export class SignupDto {
  @IsEmail({}, { message: "A valid work email address is required" })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value
  )
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  agencyName!: string;

  @IsString()
  @MinLength(12, { message: "Password must be at least 12 characters" })
  @MaxLength(100)
  password!: string;
}

export class UserProfileDto {
  id!: string;
  email!: string;
  name!: string;
  agencyId!: string;
  agencyName!: string;
  role?: string;
  permissions!: string[];
  avatarUrl?: string | null;
  lastLoginAt?: string | null;
}

