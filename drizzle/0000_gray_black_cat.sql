CREATE TABLE IF NOT EXISTS "anime" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"image" text NOT NULL,
	"animeId" varchar(10000) NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"genres" text NOT NULL,
	"released" text NOT NULL,
	"status" text NOT NULL,
	"episodes" text NOT NULL,
	CONSTRAINT "anime_animeId_unique" UNIQUE("animeId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text,
	"name" text,
	"whitelisted" text,
	CONSTRAINT "api_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "routes" (
	"path" text PRIMARY KEY NOT NULL,
	"rate_limit" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "animeIdx" ON "anime" USING btree ("animeId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx" ON "anime" USING btree ("id");