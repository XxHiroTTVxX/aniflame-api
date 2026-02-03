/**
 * Anicrush Seed Script
 * Scrapes popular anime from Anicrush and saves streaming sources to database
 */

import { AnicrushScraper } from "./index";
import { db } from "../../../db/index";
import { animeSources, sourceMappings } from "../../../db/schema";
import { eq, and } from "drizzle-orm";
import colors from "colors";

const scraper = new AnicrushScraper(true); // Enable debug mode

// Popular anime with Anicrush IDs
const POPULAR_ANIME = [
    { id: "vRPjMA", title: "Jujutsu Kaisen", anilistId: "113415" },
];

async function seedAnicrush() {
    console.log(colors.cyan("\n=================================="));
    console.log(colors.cyan("   Anicrush Seed Script Started"));
    console.log(colors.cyan("==================================\n"));

    let totalSources = 0;

    for (const anime of POPULAR_ANIME) {
        try {
            console.log(colors.blue(`\nProcessing: ${anime.title} (${anime.id})`));

            // Save source mapping
            const existingMapping = await db
                .select()
                .from(sourceMappings)
                .where(
                    and(
                        eq(sourceMappings.provider, "anicrush"),
                        eq(sourceMappings.providerId, anime.id)
                    )
                )
                .limit(1);

            if (existingMapping.length === 0) {
                await db.insert(sourceMappings).values({
                    provider: "anicrush",
                    providerId: anime.id,
                    anilistId: anime.anilistId,
                    confidence: 1.0,
                });
                console.log(colors.green(`✓ Saved mapping: anicrush/${anime.id} -> AniList ${anime.anilistId}`));
            }

            // Get episodes and sources for first 5 episodes
            for (let episodeNum = 1; episodeNum <= 5; episodeNum++) {
                try {
                    console.log(colors.gray(`  Fetching episode ${episodeNum}...`));

                    const sources = await scraper.getSources(anime.id, episodeNum.toString(), "sub", "4", false);

                    if (!sources.status || !sources.result?.sources) {
                        console.log(colors.yellow(`  ⚠️  No HLS sources for episode ${episodeNum}, skipping`));
                        continue;
                    }

                    // Save each source quality
                    for (const source of sources.result.sources) {
                        // Check if already exists
                        const existing = await db
                            .select()
                            .from(animeSources)
                            .where(
                                and(
                                    eq(animeSources.provider, "anicrush"),
                                    eq(animeSources.providerAnimeId, anime.id),
                                    eq(animeSources.episodeNumber, episodeNum),
                                    eq(animeSources.quality, source.type || "hls")
                                )
                            )
                            .limit(1);

                        if (existing.length === 0) {
                            await db.insert(animeSources).values({
                                anilistId: anime.anilistId,
                                provider: "anicrush",
                                providerAnimeId: anime.id,
                                episodeNumber: episodeNum,
                                streamUrl: source.file,
                                quality: "1080p",
                                audio: "jpn",
                                subtitles: sources.result.tracks as any,
                            });
                            totalSources++;
                            console.log(colors.green(`  ✓ Saved source for episode ${episodeNum}`));
                        }
                    }

                    // Delay to avoid rate limiting
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                } catch (error) {
                    console.error(colors.red(`  ✗ Error processing episode ${episodeNum}:`), error instanceof Error ? error.message : error);
                }
            }
        } catch (error) {
            console.error(colors.red(`Error processing ${anime.id}:`), error);
        }
    }

    console.log(colors.cyan("\n=================================="));
    console.log(colors.green(`✓ Total sources saved: ${totalSources}`));
    console.log(colors.cyan("==================================\n"));
}

// Run the seed script
seedAnicrush()
    .then(() => {
        console.log(colors.green("Seed script completed!"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(colors.red("Seed script failed:"), error);
        process.exit(1);
    });
