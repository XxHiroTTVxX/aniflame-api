/**
 * Manual test script to insert sample streaming sources
 * and verify the /sources API route works
 */

import { db } from "../db";
import { animeSources } from "../db/schema";
import colors from "colors";

async function insertTestSources() {
    console.log(colors.cyan("\n=== Inserting Test Sources ===\n"));

    // Insert test sources for One Piece (AniList ID: 21)
    const testSources = [
        {
            anilistId: "21",
            provider: "test-provider-1",
            providerAnimeId: "one-piece-test",
            episodeNumber: 1,
            episodeId: "ep-1",
            streamUrl: "https://example.com/streams/one-piece/ep1-1080p.m3u8",
            quality: "1080p",
            audio: "jpn",
            subtitles: JSON.stringify([
                { lang: "en", label: "English", url: "https://example.com/subs/ep1-en.vtt" }
            ]),
        },
        {
            anilistId: "21",
            provider: "test-provider-1",
            providerAnimeId: "one-piece-test",
            episodeNumber: 1,
            episodeId: "ep-1",
            streamUrl: "https://example.com/streams/one-piece/ep1-720p.m3u8",
            quality: "720p",
            audio: "jpn",
            subtitles: JSON.stringify([
                { lang: "en", label: "English", url: "https://example.com/subs/ep1-en.vtt" }
            ]),
        },
        {
            anilistId: "21",
            provider: "test-provider-2",
            providerAnimeId: "one-piece-alt",
            episodeNumber: 1,
            episodeId: "episode-1",
            streamUrl: "https://example.com/alt/one-piece/ep1-480p.m3u8",
            quality: "480p",
            audio: "jpn",
            subtitles: JSON.stringify([
                { lang: "en", label: "English" },
                { lang: "es", label: "Spanish" }
            ]),
        },
        {
            anilistId: "21",
            provider: "test-provider-1",
            providerAnimeId: "one-piece-test",
            episodeNumber: 2,
            episodeId: "ep-2",
            streamUrl: "https://example.com/streams/one-piece/ep2-1080p.m3u8",
            quality: "1080p",
            audio: "jpn",
            subtitles: JSON.stringify([
                { lang: "en", label: "English", url: "https://example.com/subs/ep2-en.vtt" }
            ]),
        },
    ];

    try {
        for (const source of testSources) {
            await db.insert(animeSources).values(source);
            console.log(
                colors.green(`✓ Inserted source: Episode ${source.episodeNumber} - ${source.quality} (${source.provider})`)
            );
        }

        console.log(colors.cyan("\n=== Test Sources Inserted Successfully ===\n"));
        console.log(colors.yellow("Now you can test the API:"));
        console.log(colors.white(`  curl "http://localhost:8080/sources/21?apiKey=YOUR_API_KEY"\n`));
    } catch (error) {
        console.error(colors.red("Error inserting test sources:"), error);
    }
}

// Run the test
insertTestSources()
    .then(() => {
        console.log(colors.green("Test completed!"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(colors.red("Test failed:"), error);
        process.exit(1);
    });
