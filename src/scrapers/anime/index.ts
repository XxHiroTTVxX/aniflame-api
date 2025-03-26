import type { MediaInfo } from "../../types/types";

export interface AnimeSource {
  url: string;
  quality?: string;
  type?: string;
  headers?: Record<string, string>;
  audio?: string;  // Language code of the audio track (e.g., 'jpn', 'eng')
}

export interface AnimeEpisode {
  id: string;
  number: number;
  title?: string;
  image?: string;
  description?: string;
  duration?: number;
  isFiller?: boolean;
  sources?: AnimeSource[];
  subtitles?: {
    language: string;
    url: string;
  }[];
}

export interface SearchResult {
  id: string;
  title: string;
  type?: string;
  image?: string;
  rating?: number;
  releaseDate?: string;
  totalEpisodes?: number;
}

export abstract class AnimeScraper {
  protected readonly baseUrl: string;
  protected readonly headers: Record<string, string>;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.headers = {
      "User-Agent": "AniFlame/1.0.0",
      "Accept": "application/json",
    };
  }

  /**
   * Search for anime by title
   * @param query Search query
   * @param page Page number (optional)
   */
  abstract search(query: string, page?: number): Promise<SearchResult[]>;

  /**
   * Get detailed information about an anime
   * @param id Anime ID
   */
  abstract getInfo(id: string): Promise<MediaInfo>;

  /**
   * Get episodes for an anime
   * @param id Anime ID
   */
  abstract getEpisodes(id: string): Promise<AnimeEpisode[]>;

  /**
   * Get streaming sources for an episode
   * @param episodeId Episode ID
   */
  abstract getSources(episodeId: string): Promise<AnimeSource[]>;

  /**
   * Helper method to make HTTP requests
   * @param endpoint API endpoint
   * @param options Additional fetch options
   */
  protected async fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        ...this.headers,
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Helper method to extract quality from source URL or name
   * @param url Source URL or name
   */
  protected extractQuality(url: string): string {
    const qualityRegex = /(\d{3,4})[pP]/;
    const match = url.match(qualityRegex);
    return match ? `${match[1]}p` : 'unknown';
  }

  /**
   * Helper method to normalize episode number
   * @param input Episode number or string
   */
  protected normalizeEpisodeNumber(input: string | number): number {
    if (typeof input === 'number') return input;
    const num = parseFloat(input.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  }

  /**
   * Helper method to validate and format URLs
   * @param url URL to validate and format
   */
  protected formatUrl(url: string): string {
    try {
      return new URL(url.startsWith('http') ? url : `${this.baseUrl}${url}`).toString();
    } catch {
      return url;
    }
  }

  /**
   * Helper method to extract domain from URL
   * @param url URL to extract domain from
   */
  protected extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }

  /**
   * Helper method to retry failed requests
   * @param fn Function to retry
   * @param retries Number of retries
   * @param delay Delay between retries in ms
   */
  protected async retry<T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries === 0) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retry(fn, retries - 1, delay);
    }
  }
}
