import { InfoScraper } from "..";
import type { MediaInfo } from "../../../types/types";

interface Titles {
  "x-jat": string;
  ja: string;
  it: string;
  ru: string;
  tr: string;
  bg: string;
  tl: string;
  mn: string;
  zh: string;
  en: string;
  de: string;
  fr: string;
  es: string;
  ko: string;
  pl: string;
  ar: string;
  pt: string;
  no: string;
  "pt-BR": string;
  da: string;
  fi: string;
  el: string;
  he: string;
  hu: string;
  th: string;
  my: string;
  vi: string;
  id: string;
  uk: string;
  "zh-Hant": string;
  "zh-Hans": string;
  bd: string;
  "es-GA": string;
  fa: string;
}

interface Episode {
  tvdbShowId?: number;
  tvdbId?: number;
  seasonNumber?: number;
  episodeNumber?: number;
  absoluteEpisodeNumber?: number;
  title: { [key: string]: null | string };
  airDate?: Date;
  airDateUtc?: Date;
  runtime?: number;
  overview?: string;
  image?: string;
  episode: string;
  anidbEid: number;
  length: number;
  airdate: string;
  rating?: string;
  summary?: string;
  finaleType?: string;
  airedBeforeSeasonNumber?: number;
  airedBeforeEpisodeNumber?: number;
}

interface Image {
  coverType: string;
  url: string;
}

interface Mappings {
  animeplanet_id: string;
  kitsu_id: number;
  mal_id: number;
  type: string;
  anilist_id: number;
  anisearch_id: number;
  anidb_id: number;
  notifymoe_id: string;
  livechart_id: number;
  thetvdb_id: number;
  imdb_id: string;
  themoviedb_id: string;
}

interface AniZipResponse {
  titles: Titles;
  episodes: { [key: string]: Episode };
  episodeCount: number;
  specialCount: number;
  images: Image[];
  mappings: Mappings;
}

interface FormattedEpisode {
  number: number | null;
  title: string | null;
  airDate?: string;
  summary?: string;
  image?: string;
  rating?: number;
  type: 'episode' | 'special';
}

class AniZip extends InfoScraper {
  constructor() {
    super("https://api.ani.zip");
  }

  async getInfo(mediaType: string, mediaId: number): Promise<MediaInfo | null> {
    try {
      const response = await fetch(`${this.api}/mappings?anilist_id=${mediaId}`);
      const data = await response.json() as AniZipResponse;
      return this.formatData(data);
    } catch (error) {
      console.error("Error fetching data from AniZip:", error);
      return null;
    }
  }

  protected formatData(data: AniZipResponse): MediaInfo {
    // Get the first episode for the description/summary
    const firstEpisode = data.episodes["1"];
    
    // Get the best quality cover image
    const coverImage = data.images.find(img => img.coverType === "Poster")?.url || 
                      data.images.find(img => img.coverType === "Banner")?.url ||
                      null;

    // Get the best quality banner image
    const bannerImage = data.images.find(img => img.coverType === "Fanart")?.url || null;

    // Process episodes and specials
    const episodes: FormattedEpisode[] = [];
    const specials: FormattedEpisode[] = [];

    // Handle object format
    const sortedEpisodeKeys = Object.keys(data.episodes).sort((a, b) => {
      if (!isNaN(Number(a)) && !isNaN(Number(b))) {
        return Number(a) - Number(b);
      }
      if (!isNaN(Number(a))) return -1;
      if (!isNaN(Number(b))) return 1;
      return a.localeCompare(b);
    });

    sortedEpisodeKeys.forEach(key => {
      const ep = data.episodes[key];
      if (!ep) return;

      const episode: FormattedEpisode = {
        number: ep.episodeNumber || null,
        title: ep.title.en || ep.title.ja || null,
        airDate: ep.airDate?.toString(),
        summary: ep.summary,
        image: ep.image,
        rating: ep.rating ? parseFloat(ep.rating) : undefined,
        type: 'episode'
      };

      const isSpecial = key.startsWith('S') || 
                       key.startsWith('O') || 
                       !ep.episodeNumber ||
                       (ep.title.en?.toLowerCase().includes('special') ||
                        ep.title.ja?.toLowerCase().includes('special'));

      if (isSpecial) {
        episode.type = 'special';
        specials.push(episode);
      } else {
        episodes.push(episode);
      }
    });

    // Sort episodes by number
    episodes.sort((a, b) => {
      if (a.number === null) return 1;
      if (b.number === null) return -1;
      return a.number - b.number;
    });

    return {
      id: data.mappings.anilist_id || 0,
      title: {
        english: data.titles.en || null,
        romaji: data.titles["x-jat"] || null,
        native: data.titles.ja || null,
      },
      coverImage,
      bannerImage,
      genres: [], // AniZip doesn't provide genres directly
      description: firstEpisode?.overview || null,
      characters: [], // AniZip doesn't provide character information
      relations: [], // AniZip doesn't provide relations directly
      // Additional AniZip specific data
      mappings: {
        mal_id: data.mappings.mal_id,
        anidb_id: data.mappings.anidb_id,
        thetvdb_id: data.mappings.thetvdb_id,
        imdb_id: data.mappings.imdb_id,
      },
      episodeCount: data.episodeCount,
      specialCount: data.specialCount,
      episodes,
      specials
    };
  }
}

export default AniZip;
