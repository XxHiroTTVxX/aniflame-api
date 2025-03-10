const HIANIME_BASEURL = "https://hianime.to";



import { client } from "./utils/client";
import { load } from "cheerio";
import { Megacloud } from "./utils/megacloud";


// calls ep watch endpoint in hianmie and scrapes all eps and returns them in arr
export const getEpisodes = async (animeId: string) => {
  try {
    const resp = await client.get(
      `${HIANIME_BASEURL}/ajax/v2/episode/list/${animeId.split("-").pop()}`,
      {
        headers: {
          referer: `${HIANIME_BASEURL}/watch/${animeId}`,
          "X-Requested-With": "XMLHttpRequest",
        },
      }
    );
    const $ = load(resp.data.html);
    let episodesList: {
      id: string;
      episodeId: number;
      title: string;
      number: number;
    }[] = [];
    $("#detail-ss-list div.ss-list a").each((i, el) => {
      episodesList.push({
        id: $(el).attr("href")?.split("/").pop() ?? "",
        episodeId: Number($(el).attr("href")?.split("?ep=").pop()),
        title: $(el).attr("title") ?? "",
        number: i + 1,
      });
    });

    return episodesList;
  } catch (err) {
    console.error(err);
    return { episodesList: null };
  }
};

// call server to get ep servers
export const getServers = async (epId: string) => {
  try {
    const resp = await client(
      `${HIANIME_BASEURL}/ajax/v2/episode/servers?episodeId=${epId}`,
      {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          referer: `${HIANIME_BASEURL}/watch/${epId}`,
        },
      }
    );

    const $ = load(resp.data.html);

    let servers: {
      sub: { serverId: string | null; serverName: string }[];
      dub: { serverId: string | null; serverName: string }[];
    } = {
      sub: [],
      dub: [],
    };

    $(".ps_-block.ps_-block-sub .ps__-list .server-item").each((i, el) => {
      const $parent = $(el).closest(".servers-sub, .servers-dub");
      const serverType = $parent.hasClass("servers-sub") ? "sub" : "dub";
      servers[serverType].push({
        serverId: $(el).attr("data-id") ?? null,
        serverName: $(el).text().replaceAll("\n", "").trim(),
      });
    });

    return servers;
  } catch (err) {
    console.error(err);
    return { servers: null };
  }
};

// get sources of ep
export const getSources = async (serverId: string, epId: string) => {
  try {
    const res = await client(
      `${HIANIME_BASEURL}/ajax/v2/episode/sources?id=${serverId}`,
      {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          referer: `${HIANIME_BASEURL}/watch/${epId}`,
        },
      }
    );

    const link = res.data.link;
    if (!link) return { sources: null };

    let Sourcedata = {
        intro: res.data.intro,
        outro: res.data.outro,
        sources: [],
        tracks: res.data.tracks,
        server: res.data.server,
      };
    let sources!: typeof Sourcedata | { sources: null };
    if (String(link).includes("megacloud"))
      sources = await new Megacloud(res.data.link).scrapeMegaCloud();
    else if (String(link).includes("watchsb")) sources = { sources: null };
    else if (String(link).includes("streamtape")) sources = { sources: null };
    else {
      sources = { sources: null };
      console.log("Unknown link !");
    }
    return sources;
  } catch (err) {
    console.error(err);
    return { sources: null };
  }
};