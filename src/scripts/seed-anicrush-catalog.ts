/**
 * Anicrush Catalog Seeder
 * - Iterates through the entire Anicrush catalog (page by page)
 * - Maps each anime to AniList
 * - Scrapes episodes and sources
 * 
 * This is the ultimate "Get All Anime" script for Anicrush content.
 */

import axios from 'axios';
import { AnicrushScraper } from "../scrapers/anime/anicrush";
import { processAnime } from "../lib/scraper-service";
import colors from "colors";

const ANICRUSH_LIST_URL = 'https://api.anicrush.to/shared/v2/movie/list';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://anicrush.to',
    'Referer': 'https://anicrush.to/',
    'x-site': 'anicrush'
};

async function fetchAnicrushPage(page: number) {
    try {
        const response = await axios.get(ANICRUSH_LIST_URL, {
            params: { firstLetter: '', limit: 24, page },
            headers: HEADERS
        });
        return response.data;
    } catch (error) {
        console.error(colors.red(`[AnicrushSeeder] Error fetching page ${page}:`), error instanceof Error ? error.message : error);
        return null;
    }
}

async function main() {
    console.log(colors.cyan("\n" + "=".repeat(60)));
    console.log(colors.cyan("  🚀 ANICRUSH FULL CATALOG SEEDER"));
    console.log(colors.cyan("=".repeat(60) + "\n"));

    const scraper = new AnicrushScraper(false);
    let page = 1;
    let hasNext = true;

    while (hasNext) {
        console.log(colors.blue(`\n[AnicrushSeeder] Fetching Catalog Page ${page}...`));
        const data = await fetchAnicrushPage(page);

        if (!data || !data.status || !data.result?.movies) {
            console.log(colors.red("Failed to fetch page or invalid format. Stopping."));
            break;
        }

        const movies = data.result.movies;
        console.log(colors.green(`[AnicrushSeeder] Found ${movies.length} anime on page ${page}. Processing...`));

        for (const movie of movies) {
            if (!movie.id || !movie.name) continue;

            const title = movie.name_english || movie.name;
            let year = movie.released_year ? parseInt(movie.released_year) : undefined;

            // Fallback to aired_from if released_year is missing (e.g. Death Note)
            if (!year && movie.aired_from) {
                // aired_from format: "Aug 31, 2007"
                const match = movie.aired_from.match(/(\d{4})/);
                if (match) year = parseInt(match[1]);
            }

            try {
                // Process: Map -> Scrape -> Save
                // processAnime handles the heavy lifting
                await processAnime(
                    scraper,
                    'anicrush',
                    movie.id, // The hashed ID required for scraping
                    title,
                    year
                );
            } catch (error) {
                console.error(colors.red(`   Failed to process ${title}:`), error);
            }

            // Rate Limit for AniList (90 req/min => ~666ms per req)
            // But processAnime logs take time too.
            // We'll add extensive delay to be safe
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        // Pagination check
        // API response has `totalPages`? The snippet showed `totalPages: 360`?
        // Actually checks `movies` length to decide?
        // Let's rely on totalPages if available, or just loop until empty.
        if (page >= (data.result.totalPages || 1000) || movies.length === 0) {
            hasNext = false;
        } else {
            page++;
        }
    }

    console.log(colors.green("\n[AnicrushSeeder] Catalog seed complete!"));
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Fatal error:", err);
        process.exit(1);
    });
