CREATE TABLE IF NOT EXISTS "anime" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"anilist_id" text,
	"title" text NOT NULL,
	"image" text NOT NULL,
	"animeId" varchar(10000) NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"genres" text[] NOT NULL,
	"released" integer NOT NULL,
	"status" text NOT NULL,
	"episodes" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text,
	"name" text,
	"whitelisted" boolean DEFAULT false NOT NULL,
	"discord_id" text,
	"monthly_limit" integer DEFAULT 1000 NOT NULL,
	"current_month_usage" integer DEFAULT 0 NOT NULL,
	"last_reset_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"blacklisted_ips" text[] DEFAULT '{}',
	"allowed_endpoints" text[] DEFAULT '{}',
	CONSTRAINT "api_keys_key_unique" UNIQUE("key"),
	CONSTRAINT "api_keys_discord_id_unique" UNIQUE("discord_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_usage_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"key_id" integer NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"endpoint" text,
	"status" integer,
	"client_ip" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hourly_api_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"key_id" integer NOT NULL,
	"date" date NOT NULL,
	"hour" integer NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "routes" (
	"path" text PRIMARY KEY NOT NULL,
	"rate_limit" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text,
	"password" text,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_usage_log" ADD CONSTRAINT "api_usage_log_key_id_api_keys_id_fk" FOREIGN KEY ("key_id") REFERENCES "public"."api_keys"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hourly_api_usage" ADD CONSTRAINT "hourly_api_usage_key_id_api_keys_id_fk" FOREIGN KEY ("key_id") REFERENCES "public"."api_keys"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "key_date_hour_idx" ON "hourly_api_usage" USING btree ("key_id","date","hour");