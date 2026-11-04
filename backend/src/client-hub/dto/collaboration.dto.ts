import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min, IsUUID } from "class-validator";

const communicationTypes = ["CALL", "EMAIL", "MEETING", "WHATSAPP_MESSAGE", "VIDEO_MEETING", "OTHER"] as const;
export class CommunicationQueryDto {
  @IsOptional() @IsEnum(communicationTypes) type?: typeof communicationTypes[number];
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}

export class CreateCommunicationDto {
  @IsEnum(communicationTypes) type!: typeof communicationTypes[number];
  @IsString() @MaxLength(200) subject!: string;
  @IsString() @MaxLength(10000) summary!: string;
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) participants?: string[];
  @IsDateString() occurredAt!: string;
  @IsOptional() @IsString() @MaxLength(10000) followUpNotes?: string;
  @IsOptional() @IsUUID() requirementId?: string;
}

export class CreateReferenceDto {
  @IsString() @MaxLength(200) label!: string;
  @IsUrl({ protocols: ["http", "https"], require_protocol: true }) @MaxLength(2048) url!: string;
  @IsOptional() @IsUUID() requirementId?: string;
}

export class AssetQueryDto {
  @IsOptional() @IsUUID() requirementId?: string;
  @IsOptional() @IsEnum(["FILE", "REFERENCE"]) type?: "FILE" | "REFERENCE";
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}

export class UploadClientFileDto {
  @IsOptional() @IsUUID() requirementId?: string;
  @IsOptional() @IsString() @MaxLength(200) label?: string;
}

export class TimelineQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 25;
}
