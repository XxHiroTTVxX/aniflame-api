/**
 * Scraper Service
 * Orchestrates scraping from various providers, mapping to AniList IDs,
 * and storing canonical anime data + streaming sources in the database.
 */

import { db } from "../db";
import { anime, sourceMappings, animeSources } from "../db/schema";
import { eq, and } from "drizzle-orm";
import AniList from "../scrapers/info/anilist";
import AniZip from "../scrapers/info/anizip";
import { distance } from "fastest-levenshtein";
import axios from "axios";
import colors from "colors";
import type { AnimeScraper, AnimeEpisode } from "../scrapers/anime";

const aniList = new AniList();
const aniZip = new AniZip();

const ANILIST_API_URL = "https://graphql.anilist.co/";

const SEARCH_QUERY = `
  query ($search: String) {
    Media(search: $search, type: ANIME) {
      id
      title {
        romaji
        english
        native
      }
      synonyms
      startDate {
        year
      }
    }
  }
`;

/**
 * Normalize title for better matching
 */
function normalizeTitle(title: string): string {
    return title
        .toLowerCase()
        .replace(/[\s-]*\(?(?:dub|sub|dubbed|subbed|uncensored|uncut|censored|raw)\)?/gi, "")
        .replace(/\s*[\(\[\{](?:dub|sub|dubbed|subbed|uncensored|uncut|censored|raw)[\)\]\}]/gi, "")
        .replace(/\s*(season\s*\d+|\d+st|\d+nd|\d+rd|\d+th\s+season)/gi, "")
        .replace(/\s*(part\s*\d+)/gi, "")
        .replace(/\s*(480p|720p|1080p|2160p|4k)/gi, "")
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function getAllTitles(animeTitle: any): string[] {
    const titles = [];
    if (animeTitle.romaji) titles.push(animeTitle.romaji);
    if (animeTitle.english) titles.push(animeTitle.english);
    if (animeTitle.native) titles.push(animeTitle.native);
    return titles;
}

/**
 * Map a provider's anime ID to an AniList ID using fuzzy matching
 * Returns the AniList ID and confidence score, or null if no good match
 */
export async function mapProviderToAnilist(
    provider: string,
    providerId: string,
    searchTitle: string,
    releaseYear?: number
): Promise<{ anilistId: string; confidence: number } | null> {
    try {
        // Check if mapping already exists
        const existingMapping = await db
            .select()
            .from(sourceMappings)
            .where(
                and(
                    eq(sourceMappings.provider, provider),
                    eq(sourceMappings.providerId, providerId)
                )
            )
            .limit(1);

        if (existingMapping.length > 0) {
            console.log(
                colors.cyan(
                    `[ScraperService] Found existing mapping: ${provider}/${providerId} -> AniList ${existingMapping[0].anilistId}`
                )
            );
            return {
                anilistId: existingMapping[0].anilistId,
                confidence: existingMapping[0].confidence || 1.0,
            };
        }

        // Search AniList for matching anime
        const normalizedTitle = normalizeTitle(searchTitle);
        console.log(
            colors.blue(
                `[ScraperService] Searching AniList for: "${normalizedTitle}"`
            )
        );

        const anilistResponse = await axios.post(ANILIST_API_URL, {
            query: SEARCH_QUERY,
            variables: { search: normalizedTitle },
        });

        const media = anilistResponse.data?.data?.Media;
        if (!media) {
            console.log(
                colors.yellow(`[ScraperService] No AniList results for: ${normalizedTitle}`)
            );
            return null;
        }

        const candidates = Array.isArray(media) ? media : [media];
        let bestMatch: { anilistId: string; confidence: number } | null = null;

        // Try exact match with year first
        if (releaseYear) {
            const exactYearMatch = candidates.find(
                (candidate: any) =>
                    candidate.startDate?.year === releaseYear &&
                    getAllTitles(candidate.title).some((title) => title === searchTitle)
            );
            if (exactYearMatch) {
                bestMatch = { anilistId: exactYearMatch.id.toString(), confidence: 1.0 };
            }
        }

        // Try fuzzy match if no exact match
        if (!bestMatch) {
            let highestSimilarity = 0;
            for (const candidate of candidates) {
                for (const title of getAllTitles(candidate.title)) {
                    const normalizedCandidateTitle = normalizeTitle(title);
                    const dist = distance(normalizedCandidateTitle, normalizedTitle);
                    const maxLength = Math.max(
                        normalizedCandidateTitle.length,
                        normalizedTitle.length
                    );
                    const similarity = 1 - dist / maxLength;

                    if (similarity > highestSimilarity && similarity >= 0.75) {
                        highestSimilarity = similarity;
                        bestMatch = {
                            anilistId: candidate.id.toString(),
                            confidence: similarity,
                        };
                    }
                }
            }
        }

        if (bestMatch) {
            // Save the mapping
            await db.insert(sourceMappings).values({
                provider,
                providerId,
                anilistId: bestMatch.anilistId,
                confidence: bestMatch.confidence,
            });

            console.log(
                colors.green(
                    `[ScraperService] Mapped ${provider}/${providerId} -> AniList ${bestMatch.anilistId} (confidence: ${bestMatch.confidence.toFixed(2)})`
                )
            );
        }

        return bestMatch;
    } catch (error) {
        console.error(
            colors.red(`[ScraperService] Error mapping ${provider}/${providerId}:`),
            error
        );
        return null;
    }
}

/**
 * Ensure canonical anime data exists in the anime table
 * Fetches from AniList/AniZip if not present
 */
export async function ensureAnimeExists(anilistId: string): Promise<boolean> {
    try {
        // Check if anime already exists
        const existing = await db
            .select()
            .from(anime)
            .where(eq(anime.anilistId, anilistId))
            .limit(1);

        if (existing.length > 0) {
            console.log(
                colors.gray(
                    `[ScraperService] Anime ${anilistId} already exists in database`
                )
            );
            return true;
        }

        // Fetch from AniList and AniZip
        console.log(
            colors.blue(`[ScraperService] Fetching anime data for AniList ID: ${anilistId}`)
        );
        const [aniListData, aniZipData] = await Promise.all([
            aniList.getInfo("anime", parseInt(anilistId)),
            aniZip.getInfo("anime", parseInt(anilistId)),
        ]);

        if (!aniListData && !aniZipData) {
            console.log(
                colors.red(`[ScraperService] No data found for AniList ID: ${anilistId}`)
            );
            return false;
        }

        // Merge data (prefer AniList, supplement with AniZip)
        const mergedData = {
            id: anilistId,
            anilistId: anilistId,
            title: aniListData?.title?.english || aniListData?.title?.romaji || aniZipData?.title?.english || "Unknown",
            image: aniListData?.coverImage || aniZipData?.coverImage || "",
            animeId: anilistId,
            type: "TV",
            description: aniListData?.description || aniZipData?.description || "",
            genres: aniListData?.genres || aniZipData?.genres || [],
            released: 0,
            status: "UNKNOWN",
            episodes: (typeof aniListData?.episodeCount === 'number' ? aniListData.episodeCount : aniZipData?.episodeCount) || 0,
            provider: "anilist", // Canonical data source
        };

        await db.insert(anime).values(mergedData);

        console.log(
            colors.green(
                `[ScraperService] Successfully saved anime ${anilistId}: ${mergedData.title}`
            )
        );
        return true;
    } catch (error) {
        console.error(
            colors.red(`[ScraperService] Error ensuring anime exists for ${anilistId}:`),
            error
        );
        return false;
    }
}

/**
 * Save streaming sources for an anime from a specific provider
 */
export async function saveStreamingSources(
    anilistId: string,
    provider: string,
    providerAnimeId: string,
    episodes: AnimeEpisode[]
): Promise<number> {
    try {
        let savedCount = 0;

        for (const episode of episodes) {
            if (!episode.sources || episode.sources.length === 0) {
                continue;
            }

            for (const source of episode.sources) {
                try {
                    // Check if this exact source already exists
                    const existing = await db
                        .select()
                        .from(animeSources)
                        .where(
                            and(
                                eq(animeSources.provider, provider),
                                eq(animeSources.providerAnimeId, providerAnimeId),
                                eq(animeSources.episodeNumber, episode.number),
                                eq(animeSources.quality, source.quality || "unknown")
                            )
                        )
                        .limit(1);

                    if (existing.length > 0) {
                        // Update existing source
                        await db
                            .update(animeSources)
                            .set({
                                streamUrl: source.url,
                                audio: source.audio,
                                subtitles: episode.subtitles as any,
                                updatedAt: new Date(),
                            })
                            .where(eq(animeSources.id, existing[0].id));
                    } else {
                        // Insert new source
                        const sourceData = {
                            anilistId,
                            provider,
                            providerAnimeId,
                            episodeNumber: episode.number,
                            episodeId: episode.id,
                            streamUrl: source.url,
                            quality: source.quality || "unknown",
                            audio: source.audio,
                            subtitles: episode.subtitles as any,
                        };

                        // Debug logging
                        if (!source.url) {
                            console.error(colors.red(`[ScraperService] WARNING: Source URL is missing!`));
                            console.error(colors.red(`Episode: ${episode.number}, Quality: ${source.quality}`));
                            console.error(colors.red(`Full source object:`), source);
                        }

                        await db.insert(animeSources).values(sourceData);
                        savedCount++;
                    }
                } catch (error) {
                    console.error(
                        colors.red(
                            `[ScraperService] Error saving source for episode ${episode.number}:`
                        ),
                        error
                    );
                }
            }
        }

        console.log(
            colors.green(
                `[ScraperService] Saved ${savedCount} new source(s) for ${provider}/${providerAnimeId}`
            )
        );
        return savedCount;
    } catch (error) {
        console.error(
            colors.red(`[ScraperService] Error saving streaming sources:`),
            error
        );
        return 0;
    }
}

/**
 * Orchestrate the full scraping workflow:
 * 1. Scrape anime from provider
 * 2. Map to AniList ID
 * 3. Ensure canonical anime data exists
 * 4. Save streaming sources
 */
export async function processAnime(
    scraper: AnimeScraper,
    provider: string,
    providerId: string,
    searchTitle: string,
    releaseYear?: number
): Promise<boolean> {
    try {
        console.log(
            colors.cyan(
                `\\n[ScraperService] Processing: ${provider}/${providerId} - "${searchTitle}"`
            )
        );

        // Step 1: Map to AniList ID
        const mapping = await mapProviderToAnilist(
            provider,
            providerId,
            searchTitle,
            releaseYear
        );

        if (!mapping) {
            console.log(
                colors.yellow(
                    `[ScraperService] Skipping ${provider}/${providerId} - could not map to AniList`
                )
            );
            return false;
        }

        // Step 2: Ensure canonical anime data exists
        const animeExists = await ensureAnimeExists(mapping.anilistId);
        if (!animeExists) {
            console.log(
                colors.yellow(
                    `[ScraperService] Skipping ${provider}/${providerId} - could not fetch anime data`
                )
            );
            return false;
        }

        // Step 3: Scrape episodes
        console.log(
            colors.blue(`[ScraperService] Scraping episodes for ${provider}/${providerId}`)
        );
        const episodes = await scraper.getEpisodes(providerId);

        if (!episodes || episodes.length === 0) {
            console.log(
                colors.yellow(`[ScraperService] No episodes found for ${provider}/${providerId}`)
            );
            return false;
        }

        // Step 4: Fetch sources for each episode (limited to avoid overwhelming)
        const episodesToProcess = episodes.slice(0, 5); // Process first 5 episodes as demo
        for (const episode of episodesToProcess) {
            try {
                const sources = await scraper.getSources(episode.id);
                episode.sources = sources;
                console.log(
                    colors.gray(
                        `[ScraperService] Fetched ${sources.length} source(s) for episode ${episode.number}`
                    )
                );

                // Small delay to avoid rate limiting
                await new Promise((resolve) => setTimeout(resolve, 500));
            } catch (error) {
                console.error(
                    colors.red(`[ScraperService] Error fetching sources for episode ${episode.number}:`),
                    error
                );
            }
        }

        // Step 5: Save streaming sources
        const savedCount = await saveStreamingSources(
            mapping.anilistId,
            provider,
            providerId,
            episodesToProcess
        );

        console.log(
            colors.green(
                `[ScraperService] ✓ Completed processing ${provider}/${providerId} - saved ${savedCount} sources`
            )
        );
        return true;
    } catch (error) {
        console.error(
            colors.red(`[ScraperService] Error processing ${provider}/${providerId}:`),
            error
        );
        return false;
    }
}
