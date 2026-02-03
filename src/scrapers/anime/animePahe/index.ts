import { load } from "cheerio";
import type { MediaInfo } from "../../../types/types";
import { AnimeScraper, type AnimeEpisode, type AnimeSource, type SearchResult } from "..";
import { MediaStatus } from '../../../types/enums';
import { kwikExtractor } from '../../../lib/extractors';

type Resolution = "360p" | "480p" | "720p" | "1080p";

const isValidResolution = (quality: string): quality is Resolution => {
  return ["360p", "480p", "720p", "1080p"].includes(quality);
};

interface VideoData {
  sub: Record<Resolution, { src?: string; download?: string }>;
  dub?: Record<Resolution, { src?: string; download?: string }>;
}

export class AnimePahe extends AnimeScraper {
  private readonly apiHeaders: Record<string, string>;
  private readonly browserHeaders: Record<string, string>;
  private initialized: boolean = false;
  private sessionCookie?: string;

  constructor() {
    super("https://animepahe.si");
    
    // Headers for browser-like requests
    this.browserHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.7",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Connection": "keep-alive",
      "Cookie": "__ddgid_=OTcqdThY3SqrpMKJ; __ddg2_=hYARCDSHUTVXcLWW; __ddg1_=axxddcKnDXN08jslc2Lo; SERVERID=janna; aud=jpn; av1=0; res=480",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1"
    };

    // Headers for API requests
    this.apiHeaders = {
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language": "en-US,en;q=0.7",
      "Cookie": "__ddgid_=OTcqdThY3SqrpMKJ; __ddg2_=hYARCDSHUTVXcLWW; __ddg1_=axxddcKnDXN08jslc2Lo; SERVERID=janna; aud=jpn; av1=0; res=480",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "X-Requested-With": "XMLHttpRequest",
      "Connection": "keep-alive",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin"
    };

    // Set default headers to browser headers
    Object.assign(this.headers, this.browserHeaders);
  }

  private getApiHeaders(id?: string): Record<string, string> {
    return {
      ...this.apiHeaders,
      "Referer": id ? `${this.baseUrl}/anime/${id}` : this.baseUrl
    };
  }

  private mapStatus(status: string): MediaStatus {
    switch (status.toLowerCase()) {
      case 'currently airing':
      case 'ongoing':
        return MediaStatus.RELEASING;
      case 'finished airing':
      case 'completed':
        return MediaStatus.FINISHED;
      case 'not yet aired':
        return MediaStatus.NOT_YET_RELEASED;
      case 'cancelled':
        return MediaStatus.CANCELLED;
      case 'on hiatus':
        return MediaStatus.HIATUS;
      default:
        return MediaStatus.NOT_YET_RELEASED;
    }
  }

  async search(query: string, page: number = 1): Promise<SearchResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api?m=search&q=${encodeURIComponent(query)}`, {
        headers: this.getApiHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as { data: Array<any> };
      
      if (!data.data || !Array.isArray(data.data)) {
        return [];
      }

      return data.data.map((item: any) => ({
        id: item.session,
        title: item.title,
        type: item.type,
        image: item.poster,
        rating: parseFloat(item.score) || undefined,
        releaseDate: item.year,
        totalEpisodes: item.episodes || undefined
      }));
    } catch (error) {
      console.error("Error searching:", error);
      return [];
    }
  }

  async getInfo(id: string): Promise<MediaInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/anime/${id}`, {
        headers: this.headers
      });
      const html = await response.text();
      const $ = load(html);

      const title = $('div.title-wrapper > h1 > span').first().text();
      const coverImage = $('div.anime-poster a').attr('href') || null;
      const bannerImage = $('div.anime-cover').attr('data-src') 
        ? `https:${$('div.anime-cover').attr('data-src')}` 
        : null;
      const description = $('div.anime-summary').text().trim();
      const genres = $('div.anime-genre ul li')
        .map((_, el) => $(el).find('a').attr('title'))
        .get();

      const type = $('div.anime-info > p:contains("Type:") > a').text().trim();
      const releaseDate = $('div.anime-info > p:contains("Aired:")')
        .text()
        .split('to')[0]
        .replace('Aired:', '')
        .trim();

      const episodesText = $('div.anime-info > p:contains("Episodes:")').text().replace('Episodes:', '').trim();
      const episodeCount = episodesText ? parseInt(episodesText) : undefined;

      // Get episodes data
      const episodesData = await this.getEpisodes(id);

      // Transform episodes to match MediaInfo interface
      const episodes = episodesData.map(ep => ({
        number: ep.number,
        title: ep.title || null,
        image: ep.image,
        summary: undefined,
        rating: null,
        type: 'episode' as const
      }));

      return {
        id,
        title: {
          english: title,
          romaji: null,
          native: null,
        },
        coverImage,
        bannerImage,
        description,
        genres,
        episodeCount,
        episodes,
        characters: [],
        relations: []
      };
    } catch (error) {
      console.error("Error fetching anime info:", error);
      throw error;
    }
  }

  async getEpisodes(id: string): Promise<AnimeEpisode[]> {
    const episodes: AnimeEpisode[] = [];
    let currentPage = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      try {
        const response = await fetch(
          `${this.baseUrl}/api?m=release&id=${id}&sort=episode_asc&page=${currentPage}`,
          { headers: this.getApiHeaders(id) }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json() as { data: Array<any>, last_page: number };

        const episodesData = data.data.map((ep: any) => ({
          id: `${id}/${ep.session}`,
          number: ep.episode,
          title: ep.title || undefined,
          image: ep.snapshot,
          duration: ep.duration,
          isFiller: false
        }));

        episodes.push(...episodesData);

        hasNextPage = currentPage < data.last_page;
        currentPage++;
      } catch (error) {
        console.error(`Error fetching episodes page ${currentPage}:`, error);
        hasNextPage = false;
      }
    }

    return episodes;
  }

  private async parseVideoData(html: string): Promise<VideoData> {
    const $ = load(html);
    const result: VideoData = {
      sub: {
        "360p": {},
        "480p": {},
        "720p": {},
        "1080p": {},
      },
      dub: {
        "360p": {},
        "480p": {},
        "720p": {},
        "1080p": {},
      },
    };

    // Parse video sources
    const promises = $("#resolutionMenu button")
      .map(async (_, button) => {
        const src = $(button).attr("data-src") || "";
        const fansub = $(button).attr("data-fansub") || "";
        const resolution = $(button).attr("data-resolution") || "";
        const audio = $(button).attr("data-audio") || "";
        const quality = `${resolution}p` as Resolution;

        if (!isValidResolution(quality) || !src) return;

        // Find the corresponding download link
        const downloadLink =
          $(`#pickDownload a`)
            .filter((_, a) => {
              const text = $(a).text();
              return (
                text.includes(fansub) &&
                text.includes(quality) &&
                (audio === "jpn" ? !text.includes("eng") : text.includes("eng"))
              );
            })
            .attr("href") || "";

        const m3u8Link = await this.extractStreamUrl(src);
        if (!m3u8Link) return;

        // Assign to sub or dub based on audio
        if (audio === "jpn") {
          result.sub[quality] = { src: m3u8Link, download: downloadLink };
        } else if (audio === "eng") {
          if (!result.dub) {
            result.dub = {
              "360p": {},
              "480p": {},
              "720p": {},
              "1080p": {},
            };
          }
          result.dub[quality] = { src: m3u8Link, download: downloadLink };
        }
      })
      .get();

    await Promise.all(promises);

    // Remove dub object if it has no entries
    if (result.dub && Object.values(result.dub).every(q => Object.keys(q).length === 0)) {
      delete result.dub;
    }

    return result;
  }

  async getSources(episodeId: string): Promise<AnimeSource[]> {
    try {
      const response = await fetch(`${this.baseUrl}/play/${episodeId}`, {
        headers: this.headers
      });
      const html = await response.text();
      
      const videoData = await this.parseVideoData(html);
      const sources: AnimeSource[] = [];

      // Add sub sources
      Object.entries(videoData.sub).forEach(([quality, data]) => {
        if (data.src) {
          sources.push({
            url: data.src,
            quality: quality,
            type: 'hls',
            headers: {
              "Referer": this.baseUrl
            }
          });
        }
      });

      // Add dub sources if available
      if (videoData.dub) {
        Object.entries(videoData.dub).forEach(([quality, data]) => {
          if (data.src) {
            sources.push({
              url: data.src,
              quality: quality,
              type: 'hls',
              headers: {
                "Referer": this.baseUrl
              },
              audio: 'eng'
            });
          }
        });
      }

      return sources;
    } catch (error) {
      console.error("Error fetching sources:", error);
      return [];
    }
  }

  public async extractStreamUrl(url: string): Promise<string | null> {
    return kwikExtractor.extract(url);
  }
}

// Create and export the provider instance
export const animePaheProvider = new AnimePahe();
