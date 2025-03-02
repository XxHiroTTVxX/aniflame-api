ALTER TABLE "api_keys" ADD COLUMN "discord_id" text;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_discord_id_unique" UNIQUE("discord_id");