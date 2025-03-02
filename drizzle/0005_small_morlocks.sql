UPDATE "api_keys" SET "whitelisted" = FALSE WHERE "whitelisted" IS NULL;
ALTER TABLE "api_keys" ALTER COLUMN "whitelisted" SET DEFAULT FALSE;
ALTER TABLE "api_keys" ALTER COLUMN "whitelisted" SET NOT NULL;