import { load } from "cheerio";
import axios from "axios";
import { Pool } from "pg";
import Redis from "ioredis";
import { Redis as client } from "ioredis";
import { nanoid } from "nanoid";
import { getEnvVar } from "../../../utils/envUtils";
import CryptoJS from "crypto-js";
import cache from "./cache";

// Define types
interface GogoCard {
  id: string;
  title: string;
  image: string;
  released: string;
}

interface GogoInfo {
  title: string;
  image: string;
  animeId: string;
  type: string;
  description: string;
  genres: string[];
  released: string;
  status: string;
  episodes: {
    title: string;
    number: number;
    episodeId: string;
    type: string;
    animeId: string;
  }[];
}

interface GogoRecentReleases {
  title: string;
  image: string;
  link: string;
  type: string;
}

enum GogoTypes {
  sub = "1",
  dub = "2",
  chinese = "3",
}

// Database connection
const pool = new Pool({
    connectionString: getEnvVar('POSTGRES_URL'),
  });

  const redisUrl = getEnvVar('REDIS_URL');
class Gogoanime {
  private Ajax: string;
  public useDB: boolean = true;
  public cache: Redis | undefined;
  constructor(
    public url: string,
    useDB: boolean = true,
    public useCache: boolean = true,
  ) {
    this.useCache = useCache;
    this.useDB = useDB;
    this.url = url;
    this.Ajax = "https://ajax.gogocdn.net";
    if (useCache) {
      this.cache = new client(redisUrl);
    }
  }

  public async getRecentReleases(
    page: number = 1,
    lang: GogoTypes = GogoTypes.sub
  ) {
    const cacheKey = `recent_releases_${page}_${lang}`;
    if (this.useCache && this.cache) {
      const cached = await cache.get(this.cache, cacheKey);
      if (cached) return cached;
    }
    const result: GogoRecentReleases[] = [];
    const res = await fetch(
      `${this.Ajax}/ajax/page-recent-release.html?page=${page}&type=${lang}`
    );
    const $ = load(await res.text());

    $(`div.last_episodes > ul > li`).each((i, el) => {
      const title = $(el).find("p.name > a").text();
      const image = $(el).find("div.img > a > img").attr("src");
      const link = $(el).find("p.name > a").attr("href");
      result.push({
        title: title,
        image: image || "",
        link: link || "",
        type:
          lang === GogoTypes.sub
            ? "sub"
            : lang === GogoTypes.dub
            ? "dub"
            : "chinese",
      });
    });

    return this.useCache && this.cache
      ? cache.set(this.cache, cacheKey, result, 60 * 60)
      : result;
  }

  public async Search(term: string): Promise<GogoCard[]> {
    const cacheKey = `search_${term}`;
    if (this.useCache && this.cache) {
      const cached = await cache.get<GogoCard[]>(this.cache, cacheKey);
      if (cached) return cached;
    }
    const res = await fetch(`${this.url}/search.html?keyword=${term}`);
    const cards = await this.scrapeCard(await res.text());

    return this.useCache && this.cache
      ? cache.set(this.cache, cacheKey, cards, 60 * 60)
      : cards;
  }

  public async getPopularAnime(page: number = 1): Promise<GogoCard[]> {
    const cacheKey = `popular_${page}`;
    if (this.useCache && this.cache) {
      const cached = await cache.get<GogoCard[]>(this.cache, cacheKey);
      if (cached) return cached;
    }
    const res = await fetch(`${this.url}/popular.html?page=${page}`);
    const cards = await this.scrapeCard(await res.text());

    return this.useCache && this.cache
      ? cache.set(this.cache, cacheKey, cards, 60 * 60)
      : cards;
  }

  public async getAnimeInfo(id: string): Promise<GogoInfo> {
    const cacheKey = `info_${id}`;
    if (this.useCache && this.cache) {
      const cached = await cache.get<GogoInfo>(this.cache, cacheKey);
      if (cached) return cached;
    }  

    const result: GogoInfo = {
      title: "",
      image: "",
      animeId: id,
      type: "sub",
      description: "",
      genres: [],
      released: "",
      status: "",
      episodes: [],
    };

    if (this.useDB) {
      const res = await pool.query('SELECT * FROM anime WHERE animeId = $1', [id]);
      if (res.rows.length > 0) {
        const animeInfo = res.rows[0];
        return {
          ...animeInfo,
          genres: JSON.parse(animeInfo.genres),
          episodes: JSON.parse(animeInfo.episodes),
        };
      }
    }


    const res = await axios.get(`${this.url}/category/${id}`);
    const $ = load(res.data);
    const container = $('div.anime_info_body_bg');
    result.title = $(container).find('h1').text();
    result.image = $(container).find('img').attr('src') || '';
    result.description = $(container).find('div.description').text() || '';

    $(container).find('p.type:nth-child(7) a').each((i, el) => {
      result.genres.push($(el).attr('title') || $(el).text());
    });

    result.released = $(container).find('p.type:nth-child(8)').text().replace("Released: ", "") || "???";
    result.status = $(container).find('p.type:nth-child(9) a').text() || "???";
    result.type = result.genres.includes("Dub") ? "dub" : "sub";

    const movie_id = $('input#movie_id').attr('value');
    const alias = $('input#alias_anime').attr('value');
    const episodesAjax = await axios.get(`${this.Ajax}/ajax/load-list-episode?ep_start=0&ep_end=999999999&id=${movie_id}&default_ep=0&alias=${alias}`);
    const $$ = load(episodesAjax.data);

    $$('li').each((i, el) => {
      const title = $$(el).find('a > div.name').text();
      const number = Number($$(el).find('a > div.name').text().replace("EP ", ""));
      const episode_id = $$(el).find('a').attr('href')?.replace("/", "").trim() || '';
      result.episodes.push({ title, number, episodeId: episode_id, type: 'sub', animeId: id });
    });

    if (this.useDB) {
      const res = await pool.query('SELECT * FROM anime WHERE animeId = $1', [id]);
      if (res.rows.length === 0) {
        await pool.query('INSERT INTO anime (id, title, animeId, image, description, genres, released, status, type, episodes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [
          nanoid(),
          result.title,
          result.animeId,
          result.image,
          result.description,
          JSON.stringify(result.genres),
          result.released,
          result.status,
          result.type,
          JSON.stringify(result.episodes)
        ]);
      } else {
        return result;
      }
    }
    return result;
  }


  public async getEpisodeSource(episodeId: string) {
    const cacheKey = `source-${episodeId}`;
    if (this.useCache && this.cache) {
      const result = await cache.get(this.cache, cacheKey);
      if (result) return result;
    }

    if (!episodeId) {
      throw new Error("Episode ID is required");
    }

    try {
      const res = await fetch(`${this.url}/${episodeId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch episode data");
      }

      const html = await res.text();
      const $ = load(html);

      const video_url = $(
        "html body div#wrapper_inside div#wrapper div#wrapper_bg section.content section.content_left div.main_body div.anime_video_body div.anime_muti_link > ul > li.anime > a"
      ).attr("data-video");
      if (!video_url) {
        return {
          message: "Video URL not found",
        };
      }

      const url = new URL(video_url);
      const sp = await fetch(url.href);
      if (!sp.ok) {
        throw new Error("Failed to fetch episode video source");
      }

      const spHtml = await sp.text();
      const $$ = load(spHtml);

      const iv = CryptoJS.enc.Utf8.parse(
        $$("div[class*='container-']").attr("class")?.split("-").pop() || ""
      );
      const enc = $$(`script[data-name="episode"]`).attr("data-value") || "";
      const key = CryptoJS.enc.Utf8.parse(
        $$("body[class^='container-']").attr("class")?.split("-").pop() || ""
      );
      const step1 = CryptoJS.AES.decrypt(enc, key, {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      const step2 = CryptoJS.enc.Utf8.stringify(step1);
      const step3 = step2.substr(0, step2.indexOf("&"));

      const id =
        CryptoJS.AES.encrypt(step3, key, {
          iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
        }).toString() +
        step2.substring(step2.indexOf("&")) +
        `&alias=${step3}`;

        const data = await fetch(`${url.origin}/encrypt-ajax.php?id=${id}`, {
          headers: {
            "x-requested-with": "XMLHttpRequest",
          },
        }).then((res) => res.json());  

      const sourcesKey = $$("div[class*='videocontent-']")
        .attr("class")
        ?.split("-")
        .pop();

      const sources = JSON.parse(
        CryptoJS.enc.Utf8.stringify(
          CryptoJS.AES.decrypt(
          // @ts-ignore
            data.data,
            CryptoJS.enc.Utf8.parse(sourcesKey || ""),
            {
              iv,
              mode: CryptoJS.mode.CBC,
              padding: CryptoJS.pad.Pkcs7,
            }
          )
        )
      );
      delete sources.advertising;
      delete sources.linkiframe;
      
      if (this.useCache && this.cache) {
        await cache.set(this.cache, cacheKey, sources, 60 * 10);
      }

      return sources;
    } catch (error) {
      console.error("Error getting episode source:", error);
      throw error;
    }
  }

  private async scrapeCard(html: string): Promise<GogoCard[]> {
    const result: GogoCard[] = [];
    const $ = load(html);

    $('ul.items li').each((i, el) => {
      const title = $(el).find('p.name > a').text();
      const image = $(el).find('div.img > a > img').attr('src') || '';
      const id = $(el).find('p.name > a').attr('href')?.replace('/category/', '') || '';
      const released = $(el).find('p.released').text().replace('Released: ', '').trim();
      result.push({ id, title, image, released });
    });

    return result;
  }
}

export default Gogoanime;
