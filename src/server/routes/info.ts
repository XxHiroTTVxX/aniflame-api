// Import the createResponse function
import { createResponse } from "../../lib/response";
import AniList from "../../scrapers/info/anilist";
import AniZip from "../../scrapers/info/anizip";
import { Redis } from "ioredis";
import { getEnvVar } from "../../utils/envUtils";
import type { Body } from "../../types/types";
import { db } from "../../db";
import { routes } from "../../db/schema";

const aniList = new AniList();
const aniZip = new AniZip();
const redisUrl = getEnvVar('REDIS_URL');
const redis = new Redis(redisUrl);

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
    const cached = await redis.get(cacheKey);
    if (cached) {
        return createResponse(cached);
    }

    // Fetch data from both AniList and AniZip in parallel
    const [aniListData, aniZipData] = await Promise.all([
        aniList.getInfo("anime", parseInt(id)),
        aniZip.getInfo("anime", parseInt(id))
    ]);

    if (!aniListData) {
        return createResponse(JSON.stringify({ error: "No data found." }), 400);
    }

    // Merge AniList and AniZip data
    const mergedData = {
        ...aniListData,
        // Add AniZip specific data if available
        ...(aniZipData && {
            mappings: aniZipData.mappings,
            episodeCount: aniZipData.episodeCount,
            specialCount: aniZipData.specialCount,
            episodes: aniZipData.episodes,
        })
    };

    // Cache the merged data
    await redis.set(cacheKey, JSON.stringify(mergedData));
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

// Insert the route into the database
await db.insert(routes).values({
    path: route.path,
    rateLimit: route.rateLimit
  }).onConflictDoUpdate({
    target: routes.path,
    set: {
      rateLimit: route.rateLimit
    }
  });
export default route;
