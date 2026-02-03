CREATE TABLE IF NOT EXISTS "anime_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"anilist_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_anime_id" text NOT NULL,
	"episode_number" integer NOT NULL,
	"episode_id" text,
	"stream_url" text,
	"quality" text,
	"audio" text,
	"subtitles" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "source_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"provider_id" text NOT NULL,
	"anilist_id" text NOT NULL,
	"confidence" real DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "anime_sources_anilist_idx" ON "anime_sources" USING btree ("anilist_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "provider_episode_idx" ON "anime_sources" USING btree ("provider","provider_anime_id","episode_number","quality");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "provider_id_idx" ON "source_mappings" USING btree ("provider","provider_id");