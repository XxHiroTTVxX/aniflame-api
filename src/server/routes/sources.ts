import { createResponse } from "../../lib/response";
import { db } from "../../db";
import { animeSources } from "../../db/schema";
import { eq } from "drizzle-orm";
import colors from "colors";

export const handler = async (req: Request): Promise<Response> => {
    try {
        const url = new URL(req.url);
        const paths = url.pathname.split("/");
        paths.shift(); // Remove empty string from leading /

        const anilistId = paths[1] ?? url.searchParams.get("id") ?? null;

        if (!anilistId) {
            console.log(colors.yellow("[/sources] Missing AniList ID parameter"));
            return createResponse(
                JSON.stringify({ error: "No AniList ID provided." }),
                400
            );
        }

        console.log(colors.blue(`[/sources] Fetching sources for AniList ID: ${anilistId}`));

        // Query all sources for this anime from all providers
        const sources = await db
            .select({
                provider: animeSources.provider,
                episodeNumber: animeSources.episodeNumber,
                episodeId: animeSources.episodeId,
                streamUrl: animeSources.streamUrl,
                quality: animeSources.quality,
                audio: animeSources.audio,
                subtitles: animeSources.subtitles,
            })
            .from(animeSources)
            .where(eq(animeSources.anilistId, anilistId))
            .orderBy(animeSources.episodeNumber, animeSources.provider);

        if (!sources || sources.length === 0) {
            console.log(colors.yellow(`[/sources] No sources found for AniList ID: ${anilistId}`));
            return createResponse(
                JSON.stringify({
                    anilistId,
                    sources: [],
                    message: "No streaming sources available for this anime yet."
                }),
                200
            );
        }

        // Group sources by episode number
        const groupedByEpisode: { [episodeNumber: number]: any[] } = {};

        sources.forEach(source => {
            const epNum = source.episodeNumber;
            if (!groupedByEpisode[epNum]) {
                groupedByEpisode[epNum] = [];
            }
            groupedByEpisode[epNum].push({
                provider: source.provider,
                episodeId: source.episodeId,
                streamUrl: source.streamUrl,
                quality: source.quality,
                audio: source.audio,
                subtitles: source.subtitles
            });
        });

        // Convert to array format
        const episodesArray = Object.keys(groupedByEpisode)
            .map(epNum => ({
                episodeNumber: parseInt(epNum),
                sources: groupedByEpisode[parseInt(epNum)]
            }))
            .sort((a, b) => a.episodeNumber - b.episodeNumber);

        const providerCount = new Set(sources.map(s => s.provider)).size;
        console.log(colors.green(
            `[/sources] Found ${sources.length} source(s) from ${providerCount} provider(s) ` +
            `for AniList ID: ${anilistId}`
        ));

        return createResponse(
            JSON.stringify({
                anilistId,
                totalSources: sources.length,
                providers: Array.from(new Set(sources.map(s => s.provider))),
                episodes: episodesArray
            })
        );
    } catch (e) {
        console.error(colors.red("[/sources] Error:"), e);
        return createResponse(
            JSON.stringify({ error: "An error occurred while fetching sources." }),
            500
        );
    }
};

const route = {
    path: "/sources",
    handler,
    rateLimit: 60, // 60 requests per minute
};

export default route;
