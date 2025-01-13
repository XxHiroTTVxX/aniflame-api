ALTER TABLE "anime" RENAME COLUMN "year" TO "released";--> statement-breakpoint
ALTER TABLE "anime" ADD COLUMN "anilist_id" text;