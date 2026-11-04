import { Transform, Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsDateString, IsEmail, IsEnum, IsIn, IsInt, IsNumberString, IsOptional, IsString, IsUrl, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from "class-validator";

const clientStatuses = ["LEAD", "ONBOARDING", "ACTIVE", "PAUSED", "ARCHIVED"] as const;
const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
const requirementStatuses = ["DRAFT", "UNDER_REVIEW", "CONFIRMED", "CHANGES_REQUESTED", "ARCHIVED"] as const;
export const requirementTypes = ["FUNCTIONAL", "NON_FUNCTIONAL"] as const;
export const requirementItemStatuses = ["PENDING", "CLARIFICATION", "ACCEPTED"] as const;
export const requestedServiceOptions = ["UI/UX Design", "Web Development", "Mobile App Development", "Backend Development", "API Integration", "AI / ML Development", "QA & Testing", "Cloud / Hosting", "Maintenance & Support", "Digital Marketing", "Other"] as const;
const optionalTrim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() || null : value;
const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;
const websiteInput = ({ value }: { value: unknown }) => typeof value === "string" ? (value.trim().toLowerCase().startsWith("www.") ? `https://${value.trim()}` : value.trim()) || null : value;

export class ClientQueryDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit = 20;
}

export class ClientDto {
  @Transform(trim) @IsString({ message: "Company name is required" }) @MinLength(2, { message: "Company name must be at least 2 characters" }) @MaxLength(150, { message: "Company name cannot exceed 150 characters" }) name!: string;
  @Transform(trim) @IsString({ message: "Primary contact is required" }) @MinLength(2, { message: "Primary contact must be at least 2 characters" }) @MaxLength(100, { message: "Primary contact cannot exceed 100 characters" }) @Matches(/^(?=.*\p{L})[\p{L}\p{M} .'-]+$/u, { message: "Use letters, spaces, initials, dots, apostrophes or hyphens for the contact name" }) primaryContactName!: string;
  @Transform(optionalTrim) @IsOptional() @IsEmail({}, { message: "Enter a valid email address" }) @MaxLength(320) primaryEmail?: string | null;
  @Transform(optionalTrim) @IsOptional() @IsString() @MaxLength(32) primaryPhone?: string | null;
  @Transform(websiteInput) @IsOptional() @IsUrl({ protocols: ["http", "https"], require_protocol: true }, { message: "Website must be a valid HTTP or HTTPS URL" }) @MaxLength(2048) website?: string | null;
  @IsOptional() @IsEnum(clientStatuses) status?: typeof clientStatuses[number];
}

export class UpdateClientDto {
  @Transform(trim) @IsOptional() @IsString() @MinLength(2, { message: "Company name must be at least 2 characters" }) @MaxLength(150, { message: "Company name cannot exceed 150 characters" }) name?: string | null;
  @Transform(optionalTrim) @IsOptional() @IsString() @MinLength(2, { message: "Primary contact must be at least 2 characters" }) @MaxLength(100) @Matches(/^(?=.*\p{L})[\p{L}\p{M} .'-]+$/u, { message: "Use letters, spaces, initials, dots, apostrophes or hyphens for the contact name" }) primaryContactName?: string | null;
  @Transform(optionalTrim) @IsOptional() @IsEmail({}, { message: "Enter a valid email address" }) @MaxLength(320) primaryEmail?: string | null;
  @Transform(optionalTrim) @IsOptional() @IsString() @MaxLength(32) primaryPhone?: string | null;
  @Transform(websiteInput) @IsOptional() @IsUrl({ protocols: ["http", "https"], require_protocol: true }, { message: "Website must be a valid HTTP or HTTPS URL" }) @MaxLength(2048) website?: string | null;
  @IsOptional() @IsEnum(clientStatuses) status?: typeof clientStatuses[number];
}

export class RequirementItemDto {
  @IsOptional() @IsString() id?: string;
  @Transform(optionalTrim) @IsOptional() @IsString() @MinLength(3, { message: "Requirement item title must be at least 3 characters" }) @MaxLength(150) title?: string | null;
  @Transform(optionalTrim) @IsOptional() @IsString() @MinLength(3, { message: "Item description must be at least 3 characters" }) @MaxLength(500, { message: "Item description cannot exceed 500 characters" }) description?: string | null;
  @IsOptional() @IsString() category?: string | null;
  @IsOptional() @IsEnum(requirementTypes) requirementType?: typeof requirementTypes[number];
  @IsOptional() @IsEnum(requirementItemStatuses) itemStatus?: typeof requirementItemStatuses[number];
  @IsOptional() @IsEnum(priorities) priority?: typeof priorities[number];
  @IsOptional() @IsString() notes?: string | null;
  @Type(() => Number) @IsInt() @Min(0) @Max(49) sortOrder!: number;
}

export class RequirementDto {
  @Transform(optionalTrim) @IsOptional() @IsString() @MinLength(3) @MaxLength(150) title?: string | null;
  @Transform(optionalTrim) @IsOptional() @IsString() @MaxLength(2000) businessObjective?: string | null;
  @Transform(({ value }) => Array.isArray(value) ? [...new Set(value.map((service) => typeof service === "string" ? service.trim() : service).filter(Boolean))] : value) @IsOptional() @IsArray() @ArrayMaxSize(11) @IsIn(requestedServiceOptions, { each: true, message: "Select a service from the available options" }) requestedServices?: string[];
  @Transform(optionalTrim) @IsOptional() @IsString() @MaxLength(2000) designPreferences?: string | null;
  @Transform(({ value }) => Array.isArray(value) ? [...new Set(value.map((url) => typeof url === "string" ? url.trim() : url).filter(Boolean))] : value) @IsOptional() @IsArray() @ArrayMaxSize(10, { message: "Use no more than 10 reference URLs" }) @IsUrl({ protocols: ["http", "https"], require_protocol: true }, { each: true, message: "Each reference must be an HTTP or HTTPS URL" }) referenceLinks?: string[];
  @IsOptional() @IsNumberString() budgetMin?: string | null;
  @IsOptional() @IsNumberString() budgetMax?: string | null;
  @Transform(({ value }) => typeof value === "string" ? value.trim().toUpperCase() || null : value) @IsOptional() @IsString() @Matches(/^[A-Z]{3}$/, { message: "Currency must be a three-letter ISO code" }) currency?: string | null;
  @Transform(optionalTrim) @IsOptional() @IsString() @MaxLength(50) expectedTimeline?: string | null;
  @IsOptional() @IsDateString() targetDate?: string | null;
  @Transform(optionalTrim) @IsOptional() @IsString() @MaxLength(2000) constraints?: string | null;
  @Transform(optionalTrim) @IsOptional() @IsString() @MaxLength(2000) assumptions?: string | null;
  @Transform(optionalTrim) @IsOptional() @IsString() @MaxLength(5000) additionalNotes?: string | null;
  @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => RequirementItemDto) items?: RequirementItemDto[];
  @IsOptional() @IsString() changeReason?: string;
}

export class UpdateRequirementDto {
  @Transform(optionalTrim) @IsOptional() @IsString() @MinLength(3) @MaxLength(150) title?: string | null;
  @Transform(optionalTrim) @IsOptional() @IsString() @MaxLength(2000) businessObjective?: string | null;
  @Transform(({ value }) => Array.isArray(value) ? [...new Set(value.map((service) => typeof service === "string" ? service.trim() : service).filter(Boolean))] : value) @IsOptional() @IsArray() @ArrayMaxSize(11) @IsIn(requestedServiceOptions, { each: true, message: "Select a service from the available options" }) requestedServices?: string[];
  @Transform(optionalTrim) @IsOptional() @IsString() @MaxLength(2000) designPreferences?: string | null;
  @Transform(({ value }) => Array.isArray(value) ? [...new Set(value.map((url) => typeof url === "string" ? url.trim() : url).filter(Boolean))] : value) @IsOptional() @IsArray() @ArrayMaxSize(10, { message: "Use no more than 10 reference URLs" }) @IsUrl({ protocols: ["http", "https"], require_protocol: true }, { each: true, message: "Each reference must be an HTTP or HTTPS URL" }) referenceLinks?: string[];
  @IsOptional() @IsNumberString() budgetMin?: string | null;
  @IsOptional() @IsNumberString() budgetMax?: string | null;
  @Transform(({ value }) => typeof value === "string" ? value.trim().toUpperCase() || null : value) @IsOptional() @IsString() @Matches(/^[A-Z]{3}$/, { message: "Currency must be a three-letter ISO code" }) currency?: string | null;
  @Transform(optionalTrim) @IsOptional() @IsString() @MaxLength(50) expectedTimeline?: string | null;
  @IsOptional() @IsDateString() targetDate?: string | null;
  @Transform(optionalTrim) @IsOptional() @IsString() @MaxLength(2000) constraints?: string | null;
  @Transform(optionalTrim) @IsOptional() @IsString() @MaxLength(2000) assumptions?: string | null;
  @Transform(optionalTrim) @IsOptional() @IsString() @MaxLength(5000) additionalNotes?: string | null;
  @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => RequirementItemDto) items?: RequirementItemDto[];
  @IsOptional() @IsString() changeReason?: string;
}

export class StatusDto {
  @IsEnum(requirementStatuses) status!: typeof requirementStatuses[number];
  @IsOptional() @IsString() reason?: string;
}
