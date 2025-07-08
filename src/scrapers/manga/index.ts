import type { Chapter, MangaInfo } from "../../types/types";

export interface MangaSearchResult {
  id: string;
  title: string;
  altTitles?: string[];
  img?: string | null;
  format?: string;
  year?: number;
  providerId?: string;
}

export abstract class MangaScraper {
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
   * Search for manga by title
   */
  abstract search(query: string, format?: string, year?: number): Promise<MangaSearchResult[]>;

  /**
   * Fetch chapters for a manga
   */
  abstract fetchChapters(id: string): Promise<Chapter[]>;

  /**
   * Fetch pages for a chapter
   */
  abstract fetchPages(id: string): Promise<{ url: string; index: number; headers?: Record<string, string> }[]>;

  /**
   * Helper method to make HTTP requests
   */
  protected async fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;
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
} 