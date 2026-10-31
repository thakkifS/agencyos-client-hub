import { Type } from "class-transformer";
import { IsArray, IsDateString, IsEnum, IsInt, IsNumberString, IsOptional, IsString, IsUrl, MaxLength, Min, ValidateNested } from "class-validator";

const clientStatuses = ["LEAD", "ONBOARDING", "ACTIVE", "PAUSED", "ARCHIVED"] as const;
const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
const requirementStatuses = ["DRAFT", "UNDER_REVIEW", "CONFIRMED", "CHANGES_REQUESTED", "ARCHIVED"] as const;

export class ClientQueryDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit = 20;
}

export class ClientDto {
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() @MaxLength(200) primaryContactName?: string;
  @IsOptional() @IsString() @MaxLength(320) primaryEmail?: string;
  @IsOptional() @IsString() @MaxLength(50) primaryPhone?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) website?: string;
  @IsOptional() @IsEnum(clientStatuses) status?: typeof clientStatuses[number];
}

export class UpdateClientDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(200) primaryContactName?: string;
  @IsOptional() @IsString() @MaxLength(320) primaryEmail?: string;
  @IsOptional() @IsString() @MaxLength(50) primaryPhone?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) website?: string;
  @IsOptional() @IsEnum(clientStatuses) status?: typeof clientStatuses[number];
}

export class RequirementItemDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MaxLength(200) title!: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsString() category?: string | null;
  @IsOptional() @IsEnum(priorities) priority?: typeof priorities[number];
  @IsOptional() @IsString() notes?: string | null;
  @Type(() => Number) @IsInt() @Min(0) sortOrder!: number;
}

export class RequirementDto {
  @IsString() @MaxLength(200) title!: string;
  @IsString() businessObjective!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) requestedServices?: string[];
  @IsOptional() @IsString() designPreferences?: string | null;
  @IsOptional() @IsArray() @IsUrl({}, { each: true }) referenceLinks?: string[];
  @IsOptional() @IsNumberString() budgetMin?: string | null;
  @IsOptional() @IsNumberString() budgetMax?: string | null;
  @IsOptional() @IsString() @MaxLength(3) currency?: string | null;
  @IsOptional() @IsString() expectedTimeline?: string | null;
  @IsOptional() @IsDateString() targetDate?: string | null;
  @IsOptional() @IsString() constraints?: string | null;
  @IsOptional() @IsString() assumptions?: string | null;
  @IsOptional() @IsString() additionalNotes?: string | null;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => RequirementItemDto) items?: RequirementItemDto[];
  @IsOptional() @IsString() changeReason?: string;
}

export class UpdateRequirementDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() businessObjective?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) requestedServices?: string[];
  @IsOptional() @IsString() designPreferences?: string | null;
  @IsOptional() @IsArray() @IsUrl({}, { each: true }) referenceLinks?: string[];
  @IsOptional() @IsNumberString() budgetMin?: string | null;
  @IsOptional() @IsNumberString() budgetMax?: string | null;
  @IsOptional() @IsString() @MaxLength(3) currency?: string | null;
  @IsOptional() @IsString() expectedTimeline?: string | null;
  @IsOptional() @IsDateString() targetDate?: string | null;
  @IsOptional() @IsString() constraints?: string | null;
  @IsOptional() @IsString() assumptions?: string | null;
  @IsOptional() @IsString() additionalNotes?: string | null;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => RequirementItemDto) items?: RequirementItemDto[];
  @IsOptional() @IsString() changeReason?: string;
}

export class StatusDto {
  @IsEnum(requirementStatuses) status!: typeof requirementStatuses[number];
  @IsOptional() @IsString() reason?: string;
}
