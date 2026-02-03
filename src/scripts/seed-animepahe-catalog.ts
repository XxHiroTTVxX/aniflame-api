/**
 * AnimePahe Catalog Seeder
 * - Scrapes the single "Index" page of AnimePahe
 * - Extracts all ~6000+ anime titles and IDs
 * - Maps each to AniList and seeds sources
 * 
 * This processes the entire AnimePahe library in one go.
 */

import axios from 'axios';
import { load } from 'cheerio';
import { AnimePahe } from "../scrapers/anime/animePahe";
import { processAnime } from "../lib/scraper-service";
import colors from "colors";

const ANIMEPAHE_INDEX_URL = 'https://animepahe.si/anime';
const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.7",
    "Cookie": "__ddgid_=OTcqdThY3SqrpMKJ; __ddg2_=hYARCDSHUTVXcLWW; __ddg1_=axxddcKnDXN08jslc2Lo; SERVERID=janna; aud=jpn; av1=0; res=480",
};

async function fetchAnimePaheIndex() {
    try {
        console.log(colors.blue(`[AnimePaheSeeder] Fetching index from ${ANIMEPAHE_INDEX_URL}...`));
        const response = await axios.get(ANIMEPAHE_INDEX_URL, { headers: HEADERS });
        return response.data;
    } catch (error) {
        console.error(colors.red(`[AnimePaheSeeder] Error fetching index:`), error instanceof Error ? error.message : error);
        return null;
    }
}

async function main() {
    console.log(colors.cyan("\n" + "=".repeat(60)));
    console.log(colors.cyan("  🐼 ANIMEPAHE FULL CATALOG SEEDER"));
    console.log(colors.cyan("=".repeat(60) + "\n"));

    const scraper = new AnimePahe();

    // 1. Fetch the Index Page
    const html = await fetchAnimePaheIndex();
    if (!html) {
        console.log(colors.red("Failed to fetch index. Stopping."));
        process.exit(1);
    }

    const $ = load(html);

    // 2. Extract All Anime Links
    // Selector: .tab-content .tab-pane a
    const links = $('.tab-content .tab-pane a').toArray();
    console.log(colors.green(`[AnimePaheSeeder] Found ${links.length} anime entries. Processing...`));

    // 3. Process each anime
    for (let i = 0; i < links.length; i++) {
        const el = links[i];
        const title = $(el).text().trim();
        const href = $(el).attr('href');

        // href is like /anime/uuid
        const uuid = href?.split('/anime/')[1];

        if (!uuid || !title) continue;

        // Skip empty titles if any
        if (!title) continue;

        console.log(colors.gray(`\n[${i + 1}/${links.length}] Processing: ${title} (${uuid})`));

        try {
            // processAnime handles mapping and scraping
            // Note: We don't have the year from the index page easily, so pass undefined.
            // processAnime will use fuzzy matching without year, which is fine for most titles.
            await processAnime(
                scraper,
                'animepahe',
                uuid,
                title,
                undefined // Year unknown from index list
            );
        } catch (error) {
            console.error(colors.red(`   Failed to process ${title}:`), error);
        }

        // Rate Limit for AniList (90 req/min => ~666ms per req)
        await new Promise(resolve => setTimeout(resolve, 800));
    }

    console.log(colors.green("\n[AnimePaheSeeder] Catalog seed complete!"));
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Fatal error:", err);
        process.exit(1);
    });
