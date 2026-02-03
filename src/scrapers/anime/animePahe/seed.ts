/**
 * AnimePahe Seed Script
 * Scrapes popular anime from AnimePahe and saves streaming sources to database
 */

import { AnimePahe } from "./index";
import { processAnime } from "../../../lib/scraper-service";
import colors from "colors";

const scraper = new AnimePahe();

// Popular anime to scrape (UUIDs from AnimePahe search)
const POPULAR_ANIME = [
    { id: "d58fc9f8-582e-fdf0-3618-112cd54ed5ab", title: "One Piece", year: 1999 },
    { id: "78e38106-d9f3-a8b5-7974-9702f603dc96", title: "Naruto", year: 2002 },
    { id: "8d0c8929-47e2-a116-8c83-5b83afec7b1e", title: "Demon Slayer", year: 2019 },
];

async function seedAnimePahe() {
    console.log(colors.cyan("\\n=================================="));
    console.log(colors.cyan("   AnimePahe Seed Script Started"));
    console.log(colors.cyan("==================================\\n"));

    let successCount = 0;
    let failCount = 0;

    for (const anime of POPULAR_ANIME) {
        try {
            const success = await processAnime(
                scraper,
                "animepahe",
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
seedAnimePahe()
    .then(() => {
        console.log(colors.green("Seed script completed!"));
        process.exit(0);
    })
    .catch((error) => {
        console.error(colors.red("Seed script failed:"), error);
        process.exit(1);
    });
