// Import the createResponse function
import { createResponse } from "../../lib/response";
import AniList from "../../scrapers/info/anilist";
import { Redis } from "ioredis";
import { getEnvVar } from "../../utils/envUtils";
import type { Body } from "../../types/types";

const aniList = new AniList();
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

    const cached = await redis.get(`info:${id}:${JSON.stringify(fields)}`);
    if (cached) {
        return createResponse(cached);
    }

      const data = await aniList.getInfo("anime", parseInt(id)); // Use aniList instance to call 'getInfo' method
      if (!data) {
          return createResponse(JSON.stringify({ error: "No data found." }), 400);
      }
      await redis.set(`info:${id}:${JSON.stringify(fields)}`, JSON.stringify(data));

      return createResponse(JSON.stringify(data));
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
