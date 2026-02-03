import axios from 'axios';
import { MegaCloud } from '../../../lib/extractors/megacloud';
import { AnimeScraper, type AnimeEpisode, type AnimeSource, type SearchResult } from '..';
import type { MediaInfo } from '../../../types/types';
import { MediaStatus, Type } from '../../../types/enums';

interface AnicrushSearchResult {
  id_number: string;
  id: string;
  name: string;
  name_english?: string;
  total_episodes: number;
  episodes_uploaded: string;
  studios?: string[];
  mal_score?: number;
  released_year?: string;
  aired_from?: string;
  image?: string;
  url?: string;
}

interface EpisodeListItem {
  name: string;
  epNum: string;
  episode: string;
  id_number: string;
  released: string;
  url: string;
}

interface ServerInfo {
  id: number;
  name: string;
  type: string;
}

interface ServerListResponse {
  status: boolean;
  result: {
    servers?: ServerInfo[];
    sub?: any[];
    dub?: any[];
  };
}

export class AnicrushScraper extends AnimeScraper {
  private anicrushApiUrl = 'https://api.anicrush.to/shared/v2';
  private webUrl = 'https://anicrush.to';
  private megacloud: MegaCloud;
  private verbose: boolean;

  constructor(debug = false) {
    super('https://anicrush.to');
    this.verbose = debug;
    this.megacloud = new MegaCloud();
  }

  private getCommonHeaders() {
    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.6',
      'Origin': this.webUrl,
      'Referer': `${this.webUrl}/`,
      'x-site': 'anicrush',
      'sec-ch-ua': '"Not A(Brand";v="8", "Chromium";v="120", "Brave";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'Priority': 'u=1, i'
    };
  }

  private log(...args: any[]) {
    if (this.verbose) {
      console.log(`[AnicrushScraper]`, ...args);
    }
  }

  private error(...args: any[]) {
    console.error(`[AnicrushScraper] ERROR:`, ...args);
  }

  /**
   * Standard search method
   */
  async search(query: string): Promise<SearchResult[]> {
    try {
      this.log(`Searching for anime: ${query}`);
      const response = await axios.get(`${this.anicrushApiUrl}/movie/list`, {
        params: { keyword: query, page: 1, limit: 20 },
        headers: this.getCommonHeaders(),
        timeout: 10000
      });

      if (!response.data?.result?.movies) return [];

      return (response.data.result.movies as AnicrushSearchResult[]).map(movie => {
        // Extract year from "Aug 31, 2007" or use released_year
        let releaseYear = movie.released_year;
        if (!releaseYear && movie.aired_from) {
          const packet = movie.aired_from.match(/(\d{4})/);
          if (packet) releaseYear = packet[1];
        }

        return {
          id: movie.id, // This is the encrypted ID used for other calls
          title: movie.name || movie.name_english || 'Unknown',
          image: movie.image,
          releaseDate: releaseYear,
          rating: movie.mal_score,
          totalEpisodes: movie.total_episodes
        };
      });
    } catch (error) {
      this.error('Error searching:', error);
      return [];
    }
  }

  /**
   * Get Media Info (standard interface)
   */
  async getInfo(id: string): Promise<MediaInfo> {
    // Basic impl leveraging search to get metadata if possible, or stubbing
    // Since Anicrush searches by ID nicely, we can re-use search or just return basic info
    return {
      id: id,
      title: { romaji: 'Unknown', english: 'Unknown', native: null }, // We don't have this without extra calls
      coverImage: null,
      bannerImage: null,
      genres: [],
      description: null,
      characters: [],
      relations: []
    };
  }

  /**
   * Get Episodes (standard interface)
   */
  async getEpisodes(id: string): Promise<AnimeEpisode[]> {
    try {
      this.log(`Getting episodes for ID: ${id}`);
      const response = await axios.get(`${this.anicrushApiUrl}/episode/list`, {
        params: { _movieId: id },
        headers: this.getCommonHeaders(),
        timeout: 10000
      });

      if (!response.data?.result) return [];

      let episodes: EpisodeListItem[] = [];
      if (Array.isArray(response.data.result)) {
        episodes = response.data.result;
      } else if (typeof response.data.result === 'object') {
        episodes = Object.values(response.data.result).flat() as EpisodeListItem[];
      }

      return episodes.map((ep: any) => ({
        id: ep.id_number || ep.id, // Handle both formats
        number: ep.epNum ? parseFloat(ep.epNum) : (ep.number || 0),
        title: ep.name || ep.name_english || `Episode ${ep.number}`,
        // We attach the anime ID to the episode ID so we can split it later if needed,
        // but Anicrush needs BOTH movieID and epID usually, OR just epID if unique.
        // Actually getSources needs movieID AND episode number.
        // Let's check how getSources uses inputs.
        // It uses movieID and episode NUMBER (string).
        // So we should return `id` (movieID) inside valid ID field ???
        // Wait, standard `getSources` takes ONE string `episodeId`.
        // We will encode it as `movieId/episodeNumber`.
        // Line 165 below does `const [animeId, episodeNumber] = episodeId.split('/');` in Anizone.
        // We can do the same.
      })).map(ep => ({
        ...ep,
        id: `${id}/${ep.number}` // Combine movie ID and episode number
      }))
        .filter(ep => !isNaN(ep.number)) // Filter out special episodes/movies without numbers
        .sort((a, b) => a.number - b.number);

    } catch (error) {
      this.error('Error getting episodes:', error);
      return [];
    }
  }

  /**
   * Get Sources (standard interface)
   */
  async getSources(episodeId: string): Promise<AnimeSource[]> {
    const [movieId, episodeNumber] = episodeId.split('/');
    if (!movieId || !episodeNumber) {
      this.error(`Invalid episodeId format: ${episodeId}`);
      return [];
    }

    try {
      // 1. Get Servers
      const serversResponse = await axios.get(`${this.anicrushApiUrl}/episode/servers`, {
        params: { _movieId: movieId, ep: episodeNumber },
        headers: this.getCommonHeaders(),
        timeout: 10000
      });

      // 2. We default to server 4 (MegaCloud) and sub
      const serverToUse = '4';
      const scParam = 'sub';

      // 3. Get Source Link
      const sourcesResponse = await axios.get(`${this.anicrushApiUrl}/episode/sources`, {
        params: {
          _movieId: movieId,
          ep: episodeNumber,
          sv: serverToUse,
          sc: scParam
        },
        headers: this.getCommonHeaders(),
        timeout: 10000
      });

      const embedLink = sourcesResponse.data?.result?.link || sourcesResponse.data?.result?.sources?.link;
      if (!embedLink) return [];

      // 4. Extract HLS
      const hlsUrl = await this.megacloud.extract(embedLink);
      if (!hlsUrl) return [];

      return [{
        url: hlsUrl,
        quality: '1080p', // MegaCloud usually auto/1080p
        type: 'hls',
        headers: {
          Referer: 'https://megacloud.blog'
        }
      }];

    } catch (error) {
      this.error('Error getting sources:', error instanceof Error ? error.message : error);
      return [];
    }
  }
}

