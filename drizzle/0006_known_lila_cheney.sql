ALTER TABLE "api_keys" ALTER COLUMN "whitelisted" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "whitelisted" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "whitelisted" DROP NOT NULL;