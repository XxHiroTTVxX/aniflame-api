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
      const url = `${this.baseUrl}/anime?search=${encodeURIComponent(query)}&page=${page}`;
      console.log('Fetching URL:', url); // DEBUG: Log the URL being fetched
      const response = await fetch(url, {
        headers: {
          'Cookie': this.sessionCookie || '',
          ...this.headers
        }
      });
      
      const html = await response.text();
      const $ = load(html);
      
      const results: SearchResult[] = [];

      // Updated selector for new Anizone layout
      $('div.relative.overflow-hidden.h-26.rounded-lg').each((_, el) => {
        const $el = $(el);
        const titleNode = $el.find('.h-6 a').contents().get(0);
        let title = '';
        if (titleNode && titleNode.type === 'text') {
          title = titleNode.data.trim();
        }
        // Remove any trailing genre text or excessive whitespace from title
        title = title.replace(/\s+$/, '');
        const url = $el.find('.h-6 a').attr('href');
        const id = url ? url.split('/').pop() : '';
        const image = $el.find('.absolute img').attr('src');
        const type = $el.find('.inline.text-xs.h-4.line-clamp-1 span').first().text().trim();
        // Extract genres from tag links
        const genres: string[] = [];
        $el.find('div.flex.flex-wrap.gap-2.line-clamp-1.h-6 a').each((_, genreEl) => {
          const genre = $(genreEl).text().trim();
          if (genre) genres.push(genre);
        });

        if (title && id) {
          results.push({
            id,
            title,
            type,
            image: image || undefined,
            genres
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

      // Title
      const title = $('h1.text-xl').first().text().trim();

      // Description (Synopsis)
      let description = '';
      // Try to find the synopsis div with the new structure
      const synopsisDiv = $('div.text-slate-100.text-center.lg\\:text-start.text-sm.md\\:text-base.xl\\:text-lg');
      if (synopsisDiv.length) {
        const synopsisText = synopsisDiv.find('div').first().text().trim();
        if (synopsisText) {
          description = synopsisText;
        }
      }
      // Fallback: look for a <h3> with 'Synopsis', then the next <p>
      if (!description) {
        const synopsisHeader = $('h3').filter((_: number, el: any) => $(el).text().toLowerCase().includes('synopsis')).first();
        if (synopsisHeader.length) {
          description = synopsisHeader.nextAll('p').first().text().trim();
        }
      }
      // Fallback: look for a <p> under a section with 'Synopsis'
      if (!description) {
        description = $('section:contains("Synopsis") p').first().text().trim();
      }
      // Fallback: look for any <p> with a lot of text
      if (!description) {
        description = $('p').filter((_: number, el: any) => $(el).text().length > 100).first().text().trim();
      }

      // Banner Image
      let bannerImage = null;
      const bannerImgEl = $('div.absolute.top-\\[67px\\].w-full.-z-10.h-0.pb-96.-mx-4.bg-gray-900.opacity-75.overflow-clip img').first();
      if (bannerImgEl.length) {
        bannerImage = bannerImgEl.attr('src') || null;
      }

      // Cover Image
      let coverImage = null;
      const coverImgEl = $('img.bg-gray-700.hover\\:cursor-zoom-in.max-w-auto.xs\\:max-w-\\[400px\\].max-h-\\[400px\\].rounded-md.drop-shadow-lg').first();
      if (coverImgEl.length) {
        coverImage = coverImgEl.attr('src') || null;
      }
      // Fallback: look for any img with alt attribute (cover images usually have alt text)
      if (!coverImage) {
        const fallbackImgEl = $('img[alt]').first();
        if (fallbackImgEl.length) {
          coverImage = fallbackImgEl.attr('src') || null;
        }
      }

      // Genres
      let genres: string[] = [];
      // Try to find genres in the new structure
      const genreContainer = $('div.flex.flex-wrap.gap-2.justify-center.lg\\:justify-start');
      if (genreContainer.length) {
        genres = genreContainer.find('a').map((_: number, a: any) => $(a).text().trim()).get();
      }
      // Fallback: find any genre tag container with the old structure
      if (!genres.length) {
        genres = $('div.flex.flex-wrap.gap-2.line-clamp-1.h-6 a').map((_: number, a: any) => $(a).text().trim()).get();
      }

      // Episode Count
      let episodeCount: number | undefined = undefined;
      // Try to find episode count in the new structure
      $('div.text-slate-100.text-xs.lg\\:text-base.flex.flex-wrap.justify-center.gap-2.sm\\:gap-6 span').each((_: number, el: any) => {
        const text = $(el).text().trim();
        if (/\d+\s*Episodes/i.test(text)) {
          const match = text.match(/(\d+)/);
          if (match) episodeCount = parseInt(match[1]);
        }
      });
      // Fallback: look for a span with 'Eps' or 'Episodes' in old structure
      if (!episodeCount) {
        $('div.inline.text-xs.h-4.line-clamp-1 span').each((_: number, el: any) => {
          const text = $(el).text().trim();
          if (/\d+\s*Eps/i.test(text) || /Episodes/i.test(text)) {
            const match = text.match(/(\d+)/);
            if (match) episodeCount = parseInt(match[1]);
          }
        });
      }
      // Fallback: look for a number in the header area
      if (!episodeCount) {
        const headerText = $('div.inline.text-xs.h-4.line-clamp-1').text();
        const match = headerText.match(/(\d+)\s*Eps/);
        if (match) episodeCount = parseInt(match[1]);
      }
      return {
        id,
        title: {
          english: title,
          romaji: title,
          native: title
        },
        coverImage,
        bannerImage,
        description,
        genres,
        episodeCount,
        characters: [],
        relations: []
      };
    } catch (error) {
      console.error('Error getting anime info:', error);
      throw error;
    }
  }

  /**
   * Get episodes for an anime
   */
  async getEpisodes(id: string): Promise<AnimeEpisode[]> {
    await this.initialize();
    try {
      // First get the anime info to get the episode count
      const animeInfo = await this.getInfo(id);
      const episodeCount = animeInfo.episodeCount;
      
      if (!episodeCount) {
        console.warn('No episode count found for anime:', id);
        return [];
      }
      
      const episodes: AnimeEpisode[] = [];
      
      // Generate episodes from 1 to episodeCount
      for (let episodeNumber = 1; episodeNumber <= episodeCount; episodeNumber++) {
        episodes.push({
          id: `${id}/${episodeNumber}`,
          number: episodeNumber
        });
      }
      
      return episodes;
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
      console.log('Getting sources for episode:', episodeId);
      const [animeId, episodeNumber] = episodeId.split('/');
      const episodeUrl = `${this.baseUrl}/anime/${animeId}/${episodeNumber}`;
      
      const response = await fetch(episodeUrl, {
        headers: {
          'Cookie': this.sessionCookie || '',
          ...this.headers
        }
      });
      
      const html = await response.text();
      const $ = load(html);
      
      const sources: AnimeSource[] = [];
      
      // Extract master.m3u8 URL from media-player element
      const mediaPlayerSrc = $('media-player').attr('src');
      
      if (mediaPlayerSrc && mediaPlayerSrc.includes('master.m3u8')) {
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

}
