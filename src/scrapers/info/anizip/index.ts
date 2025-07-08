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
  titles?: Titles;
  episodes?: { [key: string]: Episode };
  episodeCount?: number;
  specialCount?: number;
  images?: Image[];
  mappings?: Mappings;
}

interface FormattedEpisode {
  episode: number | null;
  title: string | null;
  airDate?: string;
  summary?: string;
  image?: string;
  rating?: number;
  type: 'episode' | 'special';
}

interface FormattedSpecial extends FormattedEpisode {
  specialNumber: number | null;
  specialType: 'special' | 'ova' | 'parody' | 'other';
  length: number | null;
  anidbEid: number | null;
  episodeKey: string;
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
//@ts-ignore
  protected formatData(data: AniZipResponse): MediaInfo | null {
    // Return null if no valid data
    if (!data.titles && !data.mappings) {
      return null;
    }

    // Get the first episode for the description/summary - add null check
    const firstEpisode = data.episodes && data.episodes["1"] ? data.episodes["1"] : null;
    
    // Get the best quality cover image - add null check for data.images
    const coverImage = data.images ? 
      (data.images.find(img => img.coverType === "Poster")?.url || 
       data.images.find(img => img.coverType === "Banner")?.url ||
       null) : null;

    // Get the best quality banner image - add null check for data.images
    const bannerImage = data.images ? 
      data.images.find(img => img.coverType === "Fanart")?.url || null : null;

    // Process episodes and specials
    const episodes: FormattedEpisode[] = [];
    const specials: FormattedSpecial[] = [];

    // Handle object format - add null check for data.episodes
    if (data.episodes) {
      const sortedEpisodeKeys = Object.keys(data.episodes).sort((a, b) => {
        if (!isNaN(Number(a)) && !isNaN(Number(b))) {
          return Number(a) - Number(b);
        }
        if (!isNaN(Number(a))) return -1;
        if (!isNaN(Number(b))) return 1;
        return a.localeCompare(b);
      });

      sortedEpisodeKeys.forEach(key => {
        const ep = data.episodes![key];  // Add ! to assert episodes exists
        if (!ep) return;

        // Always get episode number from the "episode" field
        const episodeNumber = ep.episode ? parseInt(ep.episode) : null;

        const episode: FormattedEpisode = {
          episode: episodeNumber,
          title: ep.title.en || ep.title.ja || null,
          airDate: ep.airDate?.toString() || ep.airdate || undefined,
          summary: ep.summary || ep.overview || undefined,
          image: ep.image || undefined,
          rating: ep.rating ? parseFloat(ep.rating) : undefined,
          type: 'episode'
        };

        // Only mark as special if the key starts with S, O, or P (specials, OVAs, parodies)
        // AND the episode field is not a pure number
        const isSpecial = (key.startsWith('S') || 
                          key.startsWith('O') || 
                          key.startsWith('P')) ||
                         // Also check if episode field is not a pure number
                         (ep.episode && !/^\d+$/.test(ep.episode));

        if (isSpecial) {
          episode.type = 'special';
          
          // Only include fields that have actual data
          const specialData: any = {
            episode: ep.episode || null, // Use the actual episode identifier like "S2", "O1", etc.
            title: ep.title.en || ep.title.ja || null,
            type: 'special'
          };

          // Only add fields if they have data
          if (ep.airDate || ep.airdate) {
            specialData.airDate = ep.airDate?.toString() || ep.airdate;
          }
          
          if (ep.summary) {
            specialData.summary = ep.summary;
          }
          
          if (ep.image) {
            specialData.image = ep.image;
          }
          
          if (ep.rating) {
            specialData.rating = parseFloat(ep.rating);
          }
          
          if (ep.length) {
            specialData.length = ep.length;
          }

          // Removed anidbEid field

          specials.push(specialData);
        } else {
          episodes.push(episode);
        }
      });

      // Sort episodes by episode number
      episodes.sort((a, b) => {
        if (a.episode === null) return 1;
        if (b.episode === null) return -1;
        return a.episode - b.episode;
      });
    }

    specials.sort((a, b) => {
      const aEp = a.episode?.toString() || '';
      const bEp = b.episode?.toString() || '';
      return aEp.localeCompare(bEp, undefined, { numeric: true });
    });

    return {
      id: data.mappings?.anilist_id || 0,
      title: {
        english: data.titles?.en || null,
        //@ts-ignore
        french: data.titles?.fr || null,
        japanese: data.titles?.ja || null,
        russian: data.titles?.ru || null,
        spanish: data.titles?.es || null,
        german: data.titles?.de || null,
        korean: data.titles?.ko || null,
        chinese: data.titles?.["zh-Hans"] || null,
        portuguese: data.titles?.["pt-BR"] || data.titles?.pt || null,
        italian: data.titles?.it || null,
      },
      coverImage,
      bannerImage,
      genres: [], // AniZip doesn't provide genres directly
      description: firstEpisode?.overview || null,
      characters: [], // AniZip doesn't provide character information
      relations: [], // AniZip doesn't provide relations directly
      // Additional AniZip specific data
      mappings: data.mappings ? {
        mal_id: data.mappings.mal_id,
        anidb_id: data.mappings.anidb_id,
        thetvdb_id: data.mappings.thetvdb_id,
        imdb_id: data.mappings.imdb_id,
      } : undefined,
      episodeCount: data.episodeCount,
      specialCount: data.specialCount,
      episodes,
      specials
    };
  }
}

export default AniZip;
