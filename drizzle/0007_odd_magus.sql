ALTER TABLE "api_keys" ALTER COLUMN "whitelisted" SET DATA TYPE boolean;--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "whitelisted" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "whitelisted" SET NOT NULL;