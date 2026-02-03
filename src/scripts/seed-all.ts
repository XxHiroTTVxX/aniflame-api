/**
 * Smart Master Seed Script
 * - Fetches Top Trending Anime from AniList
 * - Searches for them on ALL providers (Anizone, AnimePahe, Anicrush)
 * - Automatically maps, scrapes, and seeds sources
 */

import { AnizoneScraper } from "../scrapers/anime/anizone";
import { AnimePahe } from "../scrapers/anime/animePahe";
import { AnicrushScraper } from "../scrapers/anime/anicrush";
import { processAnime } from "../lib/scraper-service";
import { db } from "../db/index";
import { animeSources } from "../db/schema";
import { sql } from "drizzle-orm";
import axios from "axios";
import colors from "colors";

function levenshtein(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1  // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

const PER_PAGE = 50;
const MAX_PAGES = 10; // Fetch 500 anime by default. Increase to 200+ for "All".
const ANILIST_API_URL = "https://graphql.anilist.co/";

const POPULARITY_QUERY = `
  query ($page: Int, $perPage: Int) {
    Page (page: $page, perPage: $perPage) {
      pageInfo {
        hasNextPage
        total
        lastPage
      }
      media (type: ANIME, sort: POPULARITY_DESC) {
        id
        title {
          romaji
          english
          native
        }
        startDate {
          year
        }
      }
    }
  }
`;

async function fetchPopularAnime(page: number) {
    console.log(colors.blue(`\n[SeedScript] Fetching page ${page} (Top ${PER_PAGE} Popular)...`));
    try {
        const response = await axios.post(ANILIST_API_URL, {
            query: POPULARITY_QUERY,
            variables: { page: page, perPage: PER_PAGE },
        });

        // Add rate limit delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        return response.data.data.Page;
    } catch (error) {
        console.error(colors.red("[SeedScript] Error fetching from AniList"), error);
        return null;
    }
}

async function main() {
    console.log(colors.cyan("\n" + "=".repeat(60)));
    console.log(colors.cyan("  🧠 SMART SEED SCRIPT - FULL LIBRARY CRAWLER"));
    console.log(colors.cyan("=".repeat(60) + "\n"));

    // Initialize all scrapers
    const scrapers = [
        { name: "anizone", instance: new AnizoneScraper() },
        { name: "animepahe", instance: new AnimePahe() },
        { name: "anicrush", instance: new AnicrushScraper(false) },
    ];

    let currentPage = 1;
    let hasNextPage = true;

    while (hasNextPage && currentPage <= MAX_PAGES) {
        const pageData = await fetchPopularAnime(currentPage);

        if (!pageData) {
            console.log(colors.red("Failed to fetch page, stopping."));
            break;
        }

        const popularList = pageData.media;
        hasNextPage = pageData.pageInfo.hasNextPage;

        console.log(colors.green(`[SeedScript] Processing Page ${currentPage}/${Math.min(MAX_PAGES, pageData.pageInfo.lastPage)} (${popularList.length} items)`));

        // Process each anime in the page
        for (const anime of popularList) {
            const title = anime.title.english || anime.title.romaji;
            const year = anime.startDate.year;

            console.log(colors.yellow(`\n📺 Processing: ${title} (${year})`));

            for (const { name, instance } of scrapers) {
                try {
                    // Search
                    const results = await instance.search(title);
                    if (results.length === 0) continue;

                    // Find best match
                    // Filter candidates (Year match -> All results)
                    let candidates = results;
                    if (year) {
                        const yearStr = year.toString();
                        const yearMatches = results.filter(r => r.releaseDate && r.releaseDate.includes(yearStr));
                        if (yearMatches.length > 0) candidates = yearMatches;
                    }

                    // Sort by Title Similarity (Levenshtein)
                    // This ensures "Death Note" (dist=0) beats "Death Note: Rewrite" (dist=N)
                    candidates.sort((a, b) => {
                        const distA = levenshtein(title.toLowerCase(), a.title.toLowerCase());
                        const distB = levenshtein(title.toLowerCase(), b.title.toLowerCase());
                        return distA - distB;
                    });

                    const match = candidates[0];

                    console.log(colors.blue(`   ➜ ${name}: Found match "${match.title}" (ID: ${match.id})`));

                    // Process (Map -> Scrape Episodes -> Scrape Sources)
                    await processAnime(
                        instance,
                        name,
                        match.id,
                        title,
                        year
                    );
                } catch (error) {
                    // Suppress excessive error logs for minor failures
                }
            }
        }

        currentPage++;
    }

    // Final Summary
    console.log(colors.cyan("\n" + "=".repeat(60)));
    console.log(colors.cyan("  SUMMARY"));
    console.log(colors.cyan("=".repeat(60)));

    const counts = await db
        .select({
            provider: animeSources.provider,
            count: sql<number>`count(*)::int`
        })
        .from(animeSources)
        .groupBy(animeSources.provider);

    let total = 0;
    counts.forEach(({ provider, count }) => {
        console.log(colors.green(`  ${provider.padEnd(15)} ${count} sources`));
        total += count;
    });

    console.log(colors.cyan("  " + "-".repeat(30)));
    console.log(colors.green(`  ${"TOTAL".padEnd(15)} ${total} sources`));
    console.log(colors.cyan("=".repeat(60) + "\n"));
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Fatal error:", err);
        process.exit(1);
    });
