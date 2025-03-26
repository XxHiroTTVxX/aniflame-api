import cheerio from 'cheerio';
import { db } from '../../../db';
import { anime } from '../../../db/schema';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';

export class AnizoneScraper {
  private initialized: boolean = false;
  private sessionCookie?: string;
  private csrfToken?: string;
  private baseUrl = 'https://anizone.to';
  private debugMode: boolean;
  
  constructor(debugMode: boolean = false) {
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
      console.log('[DEBUG] Initialized session cookie:', this.sessionCookie);
      
      // Get CSRF token
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Extract the token from the meta tag
      this.csrfToken = $('meta[name="csrf-token"]').attr('content') || '';
      if (!this.csrfToken) {
        throw new Error('Failed to extract CSRF token');
      }
      console.log('[DEBUG] Extracted CSRF token:', this.csrfToken);
      
      this.initialized = true;
      console.log("AnizoneScraper session initialized successfully");
    } catch (error) {
      console.error("Failed to initialize AnizoneScraper:", error);
      throw error;
    }
  }
  
  /**
   * Scrape the stream URL for an episode
   */
  public async scrapeEpisodeStreamUrl(episodeUrl: string): Promise<string | null> {
    // Initialize the session on-demand when scraping is first requested
    await this.initialize();
    
    // Now proceed with the actual scraping logic
    try {
      console.log(`Scraping stream URL from: ${episodeUrl}`);
      
      const response = await fetch(episodeUrl, {
        headers: {
          'Cookie': this.sessionCookie || '',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      const html = await response.text();
      
      // Save HTML for debugging if in debug mode
      if (this.debugMode) {
        await Bun.write(`debug/episode_${episodeUrl.split('/').pop()}.html`, html);
      }
      
      // Use regex to extract the m3u8 URL from the media-player element
      const mediaPlayerRegex = /<media-player[^>]*src="([^"]+\.m3u8)"[^>]*>/i;
      const match = html.match(mediaPlayerRegex);
      
      if (match && match[1]) {
        console.log(`Found stream URL: ${match[1]}`);
        return match[1];
      }
      
      // Alternative extraction using cheerio
      const $ = cheerio.load(html);
      const mediaPlayerSrc = $('media-player').attr('src');
      
      if (mediaPlayerSrc && mediaPlayerSrc.includes('.m3u8')) {
        console.log(`Found stream URL with cheerio: ${mediaPlayerSrc}`);
        return mediaPlayerSrc;
      }
      
      console.warn(`Could not find stream URL for episode: ${episodeUrl}`);
      return null;
    } catch (error) {
      console.error(`Error scraping episode at ${episodeUrl}:`, error);
      return null;
    }
  }
  
  /**
   * Scrapes m3u8 URLs from multiple episode pages
   * @param episodeUrls Array of episode page URLs
   * @returns Map of episode URLs to their m3u8 URLs
   */
  async scrapeEpisodeStreamUrls(episodeUrls: string[]): Promise<Map<string, string>> {
    const streamUrls = new Map<string, string>();
    const BATCH_SIZE = 3; // Smaller batch size to avoid rate limiting
    
    for (let i = 0; i < episodeUrls.length; i += BATCH_SIZE) {
      const batch = episodeUrls.slice(i, i + BATCH_SIZE);
      
      console.log(`Processing batch ${i / BATCH_SIZE + 1}/${Math.ceil(episodeUrls.length / BATCH_SIZE)}`);
      
      const results = await Promise.all(
        batch.map(async (url) => {
          try {
            const streamUrl = await this.scrapeEpisodeStreamUrl(url);
            return { episodeUrl: url, streamUrl };
          } catch (error) {
            console.error(`Failed to process ${url}:`, error);
            return { episodeUrl: url, streamUrl: null };
          }
        })
      );
      
      for (const result of results) {
        if (result.streamUrl) {
          streamUrls.set(result.episodeUrl, result.streamUrl);
        }
      }
      
      // Add delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < episodeUrls.length) {
        await this.delay(2000);
      }
    }
    
    return streamUrls;
  }
  
  /**
   * Get m3u8 URLs for an anime's episodes
   * @param animeId ID of the anime
   * @param episodeUrls Array of episode URLs
   * @returns Array of m3u8 URLs corresponding to each episode URL
   */
  async getAnimeStreamUrls(animeId: string, episodeUrls: string[]): Promise<string[]> {
    if (!episodeUrls || episodeUrls.length === 0) {
      console.warn(`No episode URLs provided for anime ID: ${animeId}`);
      return [];
    }
    
    // Scrape the stream URLs for all episodes
    const streamUrlsMap = await this.scrapeEpisodeStreamUrls(episodeUrls);
    
    // Map episode URLs to their stream URLs
    const streamUrls = episodeUrls.map(episodeUrl => 
      streamUrlsMap.get(episodeUrl) || ''
    );
    
    console.log(`Retrieved ${streamUrls.filter(Boolean).length}/${episodeUrls.length} stream URLs for anime ID: ${animeId}`);
    return streamUrls;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}