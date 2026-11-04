-- Additive client validation and editable draft support. Existing data is preserved.
CREATE TYPE "RequirementType" AS ENUM ('FUNCTIONAL', 'NON_FUNCTIONAL');
CREATE TYPE "RequirementItemStatus" AS ENUM ('PENDING', 'CLARIFICATION', 'ACCEPTED');

ALTER TABLE "ClientRequirement"
  ALTER COLUMN "title" DROP NOT NULL,
  ALTER COLUMN "title" TYPE VARCHAR(150),
  ALTER COLUMN "businessObjective" DROP NOT NULL;

ALTER TABLE "RequirementItem"
  ALTER COLUMN "title" DROP NOT NULL,
  ALTER COLUMN "title" TYPE VARCHAR(150),
  ADD COLUMN "requirementType" "RequirementType" NOT NULL DEFAULT 'FUNCTIONAL',
  ADD COLUMN "itemStatus" "RequirementItemStatus" NOT NULL DEFAULT 'PENDING';

ALTER TABLE "Client"
  ALTER COLUMN "name" TYPE VARCHAR(150),
  ALTER COLUMN "primaryContactName" TYPE VARCHAR(100),
  ALTER COLUMN "primaryEmail" TYPE VARCHAR(320),
  ALTER COLUMN "primaryPhone" TYPE VARCHAR(32),
  ALTER COLUMN "website" TYPE VARCHAR(2048);

-- Normalize duplicate detection in the database as well as the API service.
CREATE UNIQUE INDEX "Client_agencyId_normalizedName_key"
  ON "Client" ("agencyId", lower(btrim("name")));

-- NOT VALID keeps legacy rows intact while enforcing these rules on new/updated rows.
ALTER TABLE "Client" ADD CONSTRAINT "Client_name_length_check"
  CHECK (char_length(btrim("name")) BETWEEN 2 AND 150) NOT VALID;
ALTER TABLE "Client" ADD CONSTRAINT "Client_contact_name_format_check"
  CHECK ("primaryContactName" IS NOT NULL AND char_length(btrim("primaryContactName")) BETWEEN 2 AND 100 AND btrim("primaryContactName") ~ '^[[:alpha:] .''-]+$') NOT VALID;
ALTER TABLE "Client" ADD CONSTRAINT "Client_email_format_check"
  CHECK ("primaryEmail" IS NULL OR btrim("primaryEmail") ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') NOT VALID;
-- Phone numbers are normalized to E.164 by libphonenumber-js in the API.
-- No DB check is added so legacy formatted values remain editable.
ALTER TABLE "Client" ADD CONSTRAINT "Client_website_http_check"
  CHECK (website IS NULL OR website ~* '^https?://[^[:space:]]+$') NOT VALID;
ALTER TABLE "Client" ADD CONSTRAINT "Client_contact_method_required_check"
  CHECK (nullif(btrim("primaryEmail"), '') IS NOT NULL OR nullif(btrim("primaryPhone"), '') IS NOT NULL OR nullif(btrim(website), '') IS NOT NULL) NOT VALID;

ALTER TABLE "ClientRequirement" ADD CONSTRAINT "ClientRequirement_title_length_check"
  CHECK (title IS NULL OR char_length(btrim(title)) BETWEEN 3 AND 150) NOT VALID;
ALTER TABLE "ClientRequirement" ADD CONSTRAINT "ClientRequirement_objective_length_check"
  CHECK ("businessObjective" IS NULL OR char_length(btrim("businessObjective")) BETWEEN 10 AND 2000) NOT VALID;
ALTER TABLE "ClientRequirement" ADD CONSTRAINT "ClientRequirement_budget_range_check"
  CHECK (("budgetMin" IS NULL OR "budgetMin" >= 0) AND ("budgetMax" IS NULL OR "budgetMax" >= 0) AND ("budgetMin" IS NULL OR "budgetMax" IS NULL OR "budgetMax" >= "budgetMin") AND (("budgetMin" IS NULL AND "budgetMax" IS NULL) OR currency IS NOT NULL)) NOT VALID;
ALTER TABLE "ClientRequirement" ADD CONSTRAINT "ClientRequirement_currency_code_check"
  CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$') NOT VALID;
ALTER TABLE "ClientRequirement" ADD CONSTRAINT "ClientRequirement_service_count_check"
  CHECK (cardinality("requestedServices") <= 11) NOT VALID;
ALTER TABLE "ClientRequirement" ADD CONSTRAINT "ClientRequirement_optional_text_length_check"
  CHECK (("designPreferences" IS NULL OR char_length("designPreferences") <= 2000) AND ("constraints" IS NULL OR char_length("constraints") <= 2000) AND ("assumptions" IS NULL OR char_length("assumptions") <= 2000) AND ("additionalNotes" IS NULL OR char_length("additionalNotes") <= 5000) AND ("expectedTimeline" IS NULL OR char_length("expectedTimeline") <= 50)) NOT VALID;
ALTER TABLE "RequirementItem" ADD CONSTRAINT "RequirementItem_title_length_check"
  CHECK (title IS NULL OR char_length(btrim(title)) BETWEEN 3 AND 150) NOT VALID;
ALTER TABLE "RequirementItem" ADD CONSTRAINT "RequirementItem_description_length_check"
  CHECK (description IS NULL OR char_length(btrim(description)) BETWEEN 3 AND 500) NOT VALID;
