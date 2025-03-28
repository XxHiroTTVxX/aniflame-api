import { load } from 'cheerio';
import { AnimeScraper, type AnimeEpisode, type AnimeSource, type SearchResult } from '..';
import type { MediaInfo } from '../../../types/types';
import { MediaStatus } from '../../../types/enums';

export class AnizoneScraper extends AnimeScraper {
  private initialized: boolean = false;
  private sessionCookie?: string;
  private csrfToken?: string;
  private debugMode: boolean;
  
  constructor(debugMode: boolean = false) {
    super('https://anizone.to');
    this.debugMode = debugMode;
  }
  
  /**
   * Initialize the scraper session only when needed
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      console.log("Initializing AnizoneScraper session...");
      
      // First request to get the initial cookie
      const response = await fetch(`${this.baseUrl}/anime`);
      const cookie = response.headers.get('Set-Cookie');
      
      if (!cookie) {
        throw new Error('Failed to get initial cookie');
      }
      
      // Extract the session cookie
      const sessionCookie = cookie.split('anizone_session')[1];
      if (!sessionCookie) {
        throw new Error('Failed to extract session cookie');
      }
      
      this.sessionCookie = `anizone_session${sessionCookie}`;
      
      if (this.debugMode) {
        console.log('[DEBUG] Initialized session cookie:', this.sessionCookie);
      }
      
      // Get CSRF token
      const html = await response.text();
      const $ = load(html);
      
      // Extract the token from the meta tag
      this.csrfToken = $('meta[name="csrf-token"]').attr('content') || '';
      if (!this.csrfToken) {
        throw new Error('Failed to extract CSRF token');
      }
      
      if (this.debugMode) {
        console.log('[DEBUG] Extracted CSRF token:', this.csrfToken);
      }
      
      this.initialized = true;
      console.log("AnizoneScraper session initialized successfully");
    } catch (error) {
      console.error("Failed to initialize AnizoneScraper:", error);
      throw error;
    }
  }

  /**
   * Search for anime by title
   */
  async search(query: string, page: number = 1): Promise<SearchResult[]> {
    await this.initialize();
    try {
      const response = await fetch(`${this.baseUrl}/search?keyword=${encodeURIComponent(query)}&page=${page}`, {
        headers: {
          'Cookie': this.sessionCookie || '',
          ...this.headers
        }
      });
      
      const html = await response.text();
      const $ = load(html);
      
      const results: SearchResult[] = [];
      
      $('.film_list-wrap .flw-item').each((_, el) => {
        const $el = $(el);
        const title = $el.find('.film-name a').text().trim();
        const url = $el.find('.film-name a').attr('href');
        const id = url?.split('/').pop() || '';
        const image = $el.find('.film-poster img').attr('data-src');
        const type = $el.find('.fd-infor .fdi-item:first-child').text().trim();
        
        if (title && id) {
          results.push({
            id,
            title,
            type,
            image: image || undefined
          });
        }
      });
      
      return results;
    } catch (error) {
      console.error('Error searching:', error);
      return [];
    }
  }

  /**
   * Get detailed information about an anime
   */
  async getInfo(id: string): Promise<MediaInfo> {
    await this.initialize();
    try {
      const response = await fetch(`${this.baseUrl}/anime/${id}`, {
        headers: {
          'Cookie': this.sessionCookie || '',
          ...this.headers
        }
      });
      
      const html = await response.text();
      const $ = load(html);
      
      const title = $('.ani_detail-stage .anis-content .anisc-detail h2.film-name').text().trim();
      const description = $('.ani_detail-stage .anis-content .anisc-detail .film-description').text().trim();
      const coverImage = $('.ani_detail-stage .anis-content .anisc-poster img').attr('src') || null;
      const bannerImage = $('.ani_detail-stage').attr('style')?.match(/url\((.*?)\)/)?.[1] || null;
      
      const genres = $('.anisc-info .item:contains("Genre") a')
        .map((_, el) => $(el).text().trim())
        .get();
      
      const status = $('.anisc-info .item:contains("Status") .name').text().trim();
      const episodeCount = parseInt($('.anisc-info .item:contains("Episodes") .name').text().trim()) || undefined;
      
      // Get episodes
      const episodes = await this.getEpisodes(id);
      
      return {
        id,
        title: {
          english: title,
          romaji: null,
          native: null
        },
        coverImage,
        bannerImage,
        description,
        genres,
        episodeCount,
        episodes: episodes.map(ep => ({
          number: ep.number,
          title: ep.title || null,
          image: ep.image,
          summary: undefined,
          rating: null,
          type: 'episode' as const
        })),
        characters: [],
        relations: []
      };
    } catch (error) {
      console.error('Error getting anime info:', error);
      throw error;
    }
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

  /**
   * Get episodes for an anime
   */
  async getEpisodes(id: string): Promise<AnimeEpisode[]> {
    await this.initialize();
    try {
      const response = await fetch(`${this.baseUrl}/ajax/episode/list/${id}`, {
        headers: {
          'Cookie': this.sessionCookie || '',
          'X-CSRF-TOKEN': this.csrfToken || '',
          ...this.headers
        }
      });
      
      const html = await response.text();
      const $ = load(html);
      
      const episodes: AnimeEpisode[] = [];
      
      $('.ss-list .ssl-item').each((_, el) => {
        const $el = $(el);
        const title = $el.find('.ssli-detail .name').text().trim();
        const number = parseInt($el.find('.ssli-order').text().trim());
        const image = $el.find('.ssl-image img').attr('src');
        
        if (number) {
          episodes.push({
            id: `${id}/${number}`,
            number,
            title: title || undefined,
            image: image || undefined,
            isFiller: false
          });
        }
      });
      
      return episodes.sort((a, b) => a.number - b.number);
    } catch (error) {
      console.error('Error getting episodes:', error);
      return [];
    }
  }

  /**
   * Get streaming sources for an episode
   */
  async getSources(episodeId: string): Promise<AnimeSource[]> {
    await this.initialize();
    try {
      const [animeId, episodeNumber] = episodeId.split('/');
      const response = await fetch(`${this.baseUrl}/ajax/episode/servers?episodeId=${episodeNumber}&id=${animeId}`, {
        headers: {
          'Cookie': this.sessionCookie || '',
          'X-CSRF-TOKEN': this.csrfToken || '',
          ...this.headers
        }
      });
      
      const html = await response.text();
      const $ = load(html);
      
      const sources: AnimeSource[] = [];
      
      // Extract stream URL from media-player element
      const mediaPlayerSrc = $('media-player').attr('src');
      
      if (mediaPlayerSrc && mediaPlayerSrc.includes('.m3u8')) {
        sources.push({
          url: mediaPlayerSrc,
          quality: '1080p', // Anizone typically provides 1080p streams
          type: 'hls',
          headers: {
            'Referer': this.baseUrl
          }
        });
      }
      
      return sources;
    } catch (error) {
      console.error('Error getting sources:', error);
      return [];
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
