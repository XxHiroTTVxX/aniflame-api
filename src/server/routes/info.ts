// Import the createResponse function
import { createResponse } from "../../lib/response";
import AniList from "../../scrapers/info/anilist";
import AniZip from "../../scrapers/info/anizip";
import { redis, isRedisEnabled } from "../../utils/redis";
import type { Body } from "../../types/types";

const aniList = new AniList();
const aniZip = new AniZip();

// Merge function to combine AniList and AniZip data without duplicates
function mergeAnimeData(aniListData: any, aniZipData: any) {
  if (!aniListData) return aniZipData;
  if (!aniZipData) return aniListData;

  return {
    // Use AniList as base, override with AniZip where appropriate
    id: aniListData.id,
    
    // Merge titles - prefer AniZip for additional languages, keep AniList for standard ones
    title: {
      english: aniListData.title?.english || aniZipData.title?.english,
      romaji: aniListData.title?.romaji || aniZipData.title?.romaji,
      native: aniListData.title?.native || aniZipData.title?.native,
      // Add AniZip's additional language titles
      ...(aniZipData.title && {
        french: aniZipData.title.french,
        russian: aniZipData.title.russian,
        spanish: aniZipData.title.spanish,
        german: aniZipData.title.german,
        korean: aniZipData.title.korean,
        chinese: aniZipData.title.chinese,
        portuguese: aniZipData.title.portuguese,
        italian: aniZipData.title.italian,
      })
    },

    // Prefer AniList images, fallback to AniZip
    coverImage: aniListData.coverImage || aniZipData.coverImage,
    bannerImage: aniListData.bannerImage || aniZipData.bannerImage,
    
    // Merge genres - combine both sources, remove duplicates
    genres: [...new Set([
      ...(aniListData.genres || []),
      ...(aniZipData.genres || [])
    ])],
    
    // Prefer AniList description, fallback to AniZip
    description: aniListData.description || aniZipData.description,
    
    // Prefer AniList characters, AniZip doesn't provide character data
    characters: aniListData.characters || [],
    
    // Prefer AniList relations, AniZip doesn't provide relation data
    relations: aniListData.relations || [],
    
    // Use AniZip mappings (more comprehensive)
    mappings: aniZipData.mappings || aniListData.mappings,
    
    // Use AniList episode count (more accurate for long series), AniZip for detailed episode data
    episodeCount: aniListData.episodes || aniZipData.episodeCount,
    specialCount: aniZipData.specialCount,
    episodes: aniZipData.episodes || [], // AniZip provides detailed episode info when available
    specials: aniZipData.specials || [],
    
    // Keep AniList specific fields
    ...(aniListData.synonyms && { synonyms: aniListData.synonyms }),
    ...(aniListData.countryOfOrigin && { countryOfOrigin: aniListData.countryOfOrigin }),
    ...(aniListData.isLicensed !== undefined && { isLicensed: aniListData.isLicensed }),
    ...(aniListData.isAdult !== undefined && { isAdult: aniListData.isAdult }),
    ...(aniListData.externalLinks && { externalLinks: aniListData.externalLinks }),
    ...(aniListData.season && { season: aniListData.season }),
    ...(aniListData.seasonYear && { seasonYear: aniListData.seasonYear }),
    ...(aniListData.type && { type: aniListData.type }),
    ...(aniListData.format && { format: aniListData.format }),
    ...(aniListData.status && { status: aniListData.status }),
    ...(aniListData.duration && { duration: aniListData.duration }),
    ...(aniListData.chapters && { chapters: aniListData.chapters }),
    ...(aniListData.volumes && { volumes: aniListData.volumes }),
    ...(aniListData.trailer && { trailer: aniListData.trailer }),
    ...(aniListData.source && { source: aniListData.source }),
    ...(aniListData.averageScore && { averageScore: aniListData.averageScore }),
    ...(aniListData.popularity && { popularity: aniListData.popularity }),
    ...(aniListData.meanScore && { meanScore: aniListData.meanScore }),
    ...(aniListData.nextAiringEpisode && { nextAiringEpisode: aniListData.nextAiringEpisode }),
    ...(aniListData.recommendations && { recommendations: aniListData.recommendations }),
    ...(aniListData.studios && { studios: aniListData.studios }),
    ...(aniListData.startDate && { startDate: aniListData.startDate }),
    ...(aniListData.endDate && { endDate: aniListData.endDate }),
  };
}

export const handler = async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const paths = url.pathname.split("/");
    paths.shift();

    const body =
        req.method === "POST"
            ? ((await req.json().catch(() => {
                  return null;
              })) as Body)
            : null;

    const id = paths[1] ?? url.searchParams.get("id") ?? null;
    if (!id) {
        return createResponse(JSON.stringify({ error: "No ID provided." }), 400);
    }

    let fields: string[] = body?.fields ?? [];
    const fieldsParam = url.searchParams.get("fields");

    if (fieldsParam && fieldsParam.startsWith("[") && fieldsParam.endsWith("]")) {
        const fieldsArray = fieldsParam
            .slice(1, -1)
            .split(",")
            .map((field) => field.trim());
        fields = fieldsArray.filter(Boolean);
    }

    const cacheKey = `info:${id}:${JSON.stringify(fields)}`;
    
    // Check for cache clear parameter
    if (url.searchParams.get("clearCache") === "true") {
      if (redis && isRedisEnabled()) {
        try {
          await redis.del(cacheKey);
          return createResponse(JSON.stringify({ message: "Cache cleared" }));
        } catch (error) {
          console.warn('Redis cache clear failed:', error);
        }
      }
    }
    
    // Check for cache bypass parameter
    const bypassCache = url.searchParams.get("bypassCache") === "true";
    
    // Only try to get from cache if Redis is available and working AND not bypassing cache
    if (redis && isRedisEnabled() && !bypassCache) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
            return createResponse(JSON.stringify(cached));
        }
      } catch (error) {
        console.warn('Redis cache read failed:', error);
      }
    }

    // Fetch data from both AniList and AniZip in parallel
    const [aniListData, aniZipData] = await Promise.all([
        aniList.getInfo("anime", parseInt(id)),
        aniZip.getInfo("anime", parseInt(id))
    ]);

    if (!aniListData && !aniZipData) {
        return createResponse(JSON.stringify({ error: "No data found." }), 400);
    }

    // Merge the data using our mapping function
    const mergedData = mergeAnimeData(aniListData, aniZipData);

    // Cache the merged data if Redis is available and working
    if (redis && isRedisEnabled()) {
      try {
        await redis.set(cacheKey, mergedData, { ex: 3600 }); // Cache for 1 hour
      } catch (error) {
        console.warn('Redis cache write failed:', error);
      }
    }
    
    return createResponse(JSON.stringify(mergedData));
  } catch (e) {
      console.error(e);
      return createResponse(JSON.stringify({ error: "An error occurred." }), 500);
  }
};

const route = {
    path: "/info",
    handler,
    rateLimit: 90,
};

export default route;
