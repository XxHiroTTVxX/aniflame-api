import { load } from "cheerio";
import Extractor from "../../../lib/extractor";
import { Format, Formats, StreamingServers, SubType } from "../../../types/enums";
import type { Episode, Result, Source } from "../../../types/types";

export default class Zoro  {
    rateLimit = 250;
    id = "zoro";
    url = "https://hianime.to";

    formats: Format[] = [Format.MOVIE, Format.ONA, Format.OVA, Format.SPECIAL, Format.TV, Format.TV_SHORT];

     get subTypes(): SubType[] {
        return [SubType.SUB, SubType.DUB];
    }

     get headers(): Record<string, string> | undefined {
        return undefined;
    }
    async search(query: string): Promise<Result[] | undefined> {
        const response = await fetch(`${this.url}/search?keyword=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error("Failed to fetch search results");
        }
        const data = await response.text();
        const results: Result[] = [];

        const $ = load(data);
        const promises: Promise<void>[] = [];

        $(".film_list-wrap > div.flw-item").map((i, el) => {
            const promise = new Promise<void>(async (resolve) => {
                const title = $(el).find("div.film-detail h3.film-name a.dynamic-name").attr("title")!.trim().replace(/\\n/g, "");
                const id = $(el).find("div:nth-child(1) > a").last().attr("href")!;
                const img = $(el).find("img").attr("data-src")!;

                const altTitles: string[] = [];
                const jpName = $(el).find("div.film-detail h3.film-name a.dynamic-name").attr("data-jname")!.trim().replace(/\\n/g, "");
                altTitles.push(jpName);

                const formatString: string = $(el).find("div.film-detail div.fd-infor span.fdi-item")?.first()?.text().toUpperCase();
                const format: Format = Formats.includes(formatString as Format) ? (formatString as Format) : Format.UNKNOWN;

                const req = await fetch(`${this.url}${id}`);
                const text = await req.text();
                const $$ = load(text);
                const jpTitle = $$($$("div.anisc-info-wrap div.anisc-info div.item").toArray()[1]).find("span.name").text();
                const synonyms = $$($$("div.anisc-info-wrap div.anisc-info div.item").toArray()[2])
                    .find("span.name")
                    .text()
                    ?.split(",")
                    .map((value) => value.trim())
                    ?.filter((value) => value !== "")
                    ?.filter(Boolean);
                const year = $$($$("div.anisc-info-wrap div.anisc-info div.item").toArray()[4]).find("span.name").text().split(" ")[1];

                jpTitle ? altTitles.push(jpTitle) : null;
                synonyms ? altTitles.push(...synonyms) : null;

                results.push({
                    id: id,
                    title: title,
                    altTitles: altTitles,
                    year: year ? Number(year) : 0,
                    format,
                    img: img,
                    providerId: this.id,
                });

                resolve();
            });

            promises.push(promise);
        });

        await Promise.all(promises);

        return results;
    }

    async fetchEpisodes(id: string): Promise<Episode[] | undefined> {
        const episodes: Episode[] = [];

        const response = await fetch(`${this.url}/ajax/v2/episode/list/${id.split("-").pop()}`, {
            headers: {
                "X-Requested-With": "XMLHttpRequest",
                Referer: `${this.url}/watch/${id}`,
            },
        });

        if (!response.ok) {
            throw new Error("Failed to fetch episodes");
        }

        const data = await response.json() as { html?: string, status?: boolean, msg?: string };

        console.log("fetchEpisodes response data:", data); // Log the response data

        if (!data.html) {
            if (data.msg) {
                throw new Error(`Error fetching episodes: ${data.msg}`);
            }
            throw new Error("Invalid response data");
        }

        const $ = load(data.html);

        const hasDubCheck = await (await fetch(`${this.url}/watch${id}`)).text();
        const $$ = load(hasDubCheck);

        const subDub = $$("div.film-stats div.tick-dub")
            .toArray()
            .map((value) => $$(value).text().toLowerCase());
        const dubCount = subDub.length >= 1 ? parseInt(subDub[0]) : false;

        $("div.detail-infor-content > div > a").map((i, el) => {
            const number = parseInt($(el).attr("data-number")!);
            const title = $(el).attr("title")!;
            const id = $(el).attr("href")!;
            const isFiller = $(el).hasClass("ssl-item-filler")!;

            episodes.push({
                id,
                isFiller,
                number,
                title,
                img: null,
                hasDub: dubCount ? number <= dubCount : false,
                description: null,
                rating: null,
            });
        });

        return episodes;
    }

    async fetchSources(id: string, subType: SubType = SubType.SUB, server: StreamingServers = StreamingServers.VidCloud): Promise<Source | undefined> {
        const result: Source = {
            sources: [],
            subtitles: [],
            audio: [],
            intro: {
                start: 0,
                end: 0,
            },
            outro: {
                start: 0,
                end: 0,
            },
            headers: this.headers ?? {},
        };

        if (id.startsWith("http")) {
            const serverURL = id;

            return await new Extractor(serverURL, result).extract(server ?? StreamingServers.VidCloud);
        }

        const response = await fetch(`${this.url}/ajax/v2/episode/servers?episodeId=${id.split("?ep=")[1]}`);
        
        if (!response.ok) {
            throw new Error("Failed to fetch sources");
        }

        const data = await response.json() as { html?: string, status?: boolean, msg?: string };

        console.log("fetchSources response data:", data); // Log the response data

        if (!data.html) {
            if (data.msg) {
                throw new Error(`Error fetching sources: ${data.msg}`);
            }
            throw new Error("Invalid response data");
        }

        const $ = load(data.html);

        let serverId;
        switch (server) {
            case StreamingServers.VidCloud:
                serverId = this.retrieveServerId($, 4, subType);

                if (!serverId) throw new Error("RapidCloud not found");
                break;
            case StreamingServers.VidStreaming:
                serverId = this.retrieveServerId($, 4, subType);

                if (!serverId) throw new Error("VidStreaming not found");
                break;
            case StreamingServers.StreamSB:
                serverId = this.retrieveServerId($, 5, subType);

                if (!serverId) throw new Error("StreamSB not found");
                break;
            case StreamingServers.StreamTape:
                serverId = this.retrieveServerId($, 3, subType);

                if (!serverId) throw new Error("StreamTape not found");
                break;
            default:
                serverId = this.retrieveServerId($, 4, subType);

                if (!serverId) throw new Error("RapidCloud not found");
                break;
        }

        const req = await fetch(`${this.url}/ajax/v2/episode/sources?id=${serverId}`);
        
        if (!req.ok) {
            throw new Error("Failed to fetch source link");
        }

        const reqData = await req.json() as { link?: string, msg?: string };

        if (!reqData.link) {
            throw new Error("Invalid source link");
        }

        return await this.fetchSources(reqData.link, subType, server ?? StreamingServers.VidCloud);
    }

    private retrieveServerId($: any, index: number, subOrDub: SubType) {
        return (
            $(`div.ps_-block.ps_-block-sub.servers-${subOrDub} > div.ps__-list > div`)
                .map((i: any, el: any) => ($(el).attr("data-server-id") === `${index}` ? $(el) : null))
                .get()[0]
                ?.attr("data-id") ?? ""
        );
    }
}