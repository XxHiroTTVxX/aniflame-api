/**
 * Anizone Seed Script
 * Scrapes popular anime from Anizone and saves streaming sources to database
 */

import { AnizoneScraper } from "./index";
import { processAnime } from "../../../lib/scraper-service";
import colors from "colors";

const scraper = new AnizoneScraper(true); // Enable debug mode

// Popular anime to scrape (using correct IDs from Anizone)
const POPULAR_ANIME = [
    { id: "uyyyn4kf", title: "One Piece", year: 1999 },
    // Add more anime after testing One Piece works
];

async function seedAnizone() {
    console.log(colors.cyan("\\n=================================="));
    console.log(colors.cyan("   Anizone Seed Script Started"));
    console.log(colors.cyan("==================================\\n"));

    let successCount = 0;
    let failCount = 0;

    for (const anime of POPULAR_ANIME) {
        try {
            const success = await processAnime(
                scraper,
                "anizone",
                anime.id,
                anime.title,
                anime.year
            );

            if (success) {
                successCount++;
            } else {
                failCount++;
            }

            // Delay between anime to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error) {
            console.error(
                colors.red(`Error processing ${anime.id}:`),
                error
            );
            failCount++;
        }
    }

    console.log(colors.cyan("\\n=================================="));
    console.log(colors.green(`✓ Successfully processed: ${successCount}`));
    console.log(colors.red(`✗ Failed: ${failCount}`));
    console.log(colors.cyan("==================================\\n"));
}

// Run the seed script
seedAnizone()
    .then(() => {
        console.log(colors.green("Seed script completed!"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(colors.red("Seed script failed:"), error);
        process.exit(1);
    });
