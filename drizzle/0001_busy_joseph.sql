ALTER TABLE "anime" ALTER COLUMN "id" SET DATA TYPE varchar(64);--> statement-breakpoint
ALTER TABLE "anime" ALTER COLUMN "released" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "anime" ALTER COLUMN "episodes" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "anime" ADD COLUMN "episode_urls" text[];