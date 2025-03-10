import cheerio from 'cheerio';
import { db } from '../../../db';
import { anime } from '../../../db/schema';
import { nanoid } from 'nanoid';


// Initial snapshot for the first request
const initialSnapshot =
  '{"data":{"title":"Anime Index","search":"","listSize":96,"sort":"title-asc","type":"0","sortOptions":[{"title-asc":"A-Z","title-desc":"Z-A","release-asc":"Earliest Release","release-desc":"Latest Release","added-asc":"First Added","added-desc":"Last Added"},{"s":"arr"}],"typeOptions":[["All","Unknown","TV Series","OVA","Movie","Other","Web","TV Special","Music Video"],{"s":"arr"}],"view":"list","viewCookie":"anime-view","paginators":[{"page":1},{"s":"arr"}]},"memo":{"id":"qWKeu5feJk5vhTczXBFG","name":"pages.anime-index","path":"anime","method":"GET","children":[],"scripts":[],"assets":[],"errors":[],"locale":"en"},"checksum":"c495ecb35e93841334124d3681b049bd17b878f5e78566e64512d21820557b9c"}';


  interface AnimeData {
    // Core identification
    title: string;
    detailUrl: string;
    
    // Descriptive information
    synopsis: string;
    genres: string[];
    
    // Metadata
    episodes: number;
    type: string;
    releaseYear: number;
    status: string;
    
    // Media
    image: string;
    
    // Add episode URLs
    episodeUrls: string[];
  }

export class AnizoneClient {
  private baseUrl = 'https://anizone.to';
  private currentCookie: string;
  private currentToken: string | undefined;

  constructor() {
    this.currentCookie = '';
  }

  async initializeSession(): Promise<void> {
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
    
    this.currentCookie = `anizone_session${sessionCookie}`;
    console.log('[DEBUG] Initialized session cookie:', this.currentCookie);
  }

  async initializeToken(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/anime`, {
      headers: {
        'Cookie': this.currentCookie
      }
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract the token from the meta tag
    this.currentToken = $('meta[name="csrf-token"]').attr('content') || '';
    if (!this.currentToken) {
      throw new Error('Failed to extract CSRF token');
    }
    console.log('[DEBUG] Extracted CSRF token:', this.currentToken);
  }

  async loadMore(snapshot: string): Promise<any> {
    console.log('[DEBUG] Starting loadMore with snapshot:', snapshot);
    console.log('[DEBUG] Current session cookie:', this.currentCookie);

    if (!this.currentToken) {
      await this.initializeToken();
    }

    const body = {
      _token: this.currentToken,
      components: [
        {
          snapshot,
          updates: {},
          calls: [
            {
              path: '',
              method: 'loadMore',
              params: [],
            },
          ],
        },
      ],
    };

    console.log('[DEBUG] Request body:', JSON.stringify(body, null, 2));

    try {
      const response = await fetch(`${this.baseUrl}/livewire/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: this.currentCookie,
        },
        body: JSON.stringify(body),
      });

      console.log('[DEBUG] Response status:', response.status);
      console.log('[DEBUG] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('[ERROR] Error response body:', errorBody);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update cookie from response
      const newCookie = response.headers.get('Set-Cookie');
      if (newCookie) {
        console.log('[DEBUG] Received new cookie:', newCookie);
        const sessionCookie = newCookie.split('anizone_session')[1];
        this.currentCookie = sessionCookie ? `anizone_session${sessionCookie}` : this.currentCookie;
        console.log('[DEBUG] Updated session cookie:', this.currentCookie);
      }

      const responseData = await response.json();
      console.log('[DEBUG] Response data:', responseData);
      return responseData;
    } catch (error) {
      console.error('[ERROR] Error in loadMore:', error);
      throw error;
    }
  }

  getCurrentCookie(): string {
    return this.currentCookie;
  }
}


export class AnizoneScraper {
  private baseUrl = 'https://anizone.to';
  private client: AnizoneClient;
  private cache: Map<string, AnimeData> = new Map();
  private debugMode: boolean;

  constructor(debugMode: boolean = false) {
    this.client = new AnizoneClient();
    this.debugMode = debugMode;
  }

  async saveAnimeData(animeData: AnimeData[]): Promise<void> {
    if (animeData.length === 0) return;
    
    const maxRetries = 3;
    let attempts = 0;
    
    // Helper function to validate and convert numbers
    const validateNumber = (value: any, defaultValue: number = 0): number => {
      const num = Number(value);
      return isNaN(num) ? defaultValue : num;
    };

    while (attempts < maxRetries) {
      try {
        await db.insert(anime).values(animeData.map(data => ({
          id: nanoid(24),
          animeId: data.detailUrl.split('/').pop() || '',
          title: data.title,
          image: data.image,
          description: data.synopsis,
          released: validateNumber(data.releaseYear),
          type: data.type,
          status: data.status,
          episodes: validateNumber(data.episodes),
          genres: data.genres,
          episodeUrls: data.episodeUrls,
          createdAt: new Date(),
          updatedAt: new Date()
        })));
        console.log(`Inserted ${animeData.length} anime records`);
        return;
      } catch (error) {
        attempts++;
        console.error(`Error saving anime data (attempt ${attempts}/${maxRetries}):`, error);
        
        if (attempts < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
        } else {
          throw error;
        }
      }
    }
  }

  async scrapeAllAnime(): Promise<AnimeData[]> {
    await this.client.initializeSession();
    await this.client.initializeToken();
    const links = await this.getAllLinks();
    
    console.log('Collected links:', links);
    
    const animeData = await this.processPages(links);
    await this.saveAnimeData(animeData);
    return animeData;
  }

  private async getAllLinks(): Promise<string[]> {
    let snapshot = initialSnapshot;
    const allLinks = new Set<string>();
    let hasMore = true;
    let attempts = 0;
    const maxLinks = 1000;

    while (hasMore && attempts < 50 && allLinks.size < maxLinks) {
      try {
        const response = await this.client.loadMore(snapshot);
        
        const html = response.components[0]?.effects?.html;
        if (!html) {
          console.warn('No HTML content found in response');
          hasMore = false;
          continue;
        }
        
        const $ = cheerio.load(html);
        const pageLinks = $('a[href*="/anime/"]')
          .map((_, el) => new URL($(el).attr('href')!, this.baseUrl).toString())
          .get();
        
        if (pageLinks.length > 0) {
          pageLinks.forEach(link => {
            allLinks.add(link);
            console.log('Found link:', link);
          });
          snapshot = response.components[0].snapshot;
          console.log(`Found ${pageLinks.length} links on page ${attempts + 1} (Total: ${allLinks.size})`);
        } else {
          hasMore = false;
        }
        
        await this.delay(1500);
        attempts++;
      } catch (error) {
        console.error('Error during pagination:', error);
        hasMore = false;
      }
    }

    return Array.from(allLinks);
  }

  private async processPages(links: string[]): Promise<AnimeData[]> {
    const results: AnimeData[] = [];
    const BATCH_SIZE = 5; // Number of concurrent requests
    
    for (let i = 0; i < links.length; i += BATCH_SIZE) {
      const batch = links.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (link) => {
          try {
            const data = await this.scrapePage(link);
            console.log(`Processed ${i + 1}/${links.length}: ${data.title}`);
            return data;
          } catch (error) {
            console.error(`Failed to process ${link}:`, error);
            return null;
          }
        })
      );
      
      results.push(...batchResults.filter(Boolean) as AnimeData[]);
      await this.delay(1000); // Delay between batches
    }
    
    return results;
  }

  private async scrapePage(url: string): Promise<AnimeData> {
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    const response = await fetch(url, {
      headers: {
        'Cookie': this.client.getCurrentCookie(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const html = await response.text();
    
    // Save HTML for debugging if in debug mode
    if (this.debugMode) {
      await Bun.write(`debug/${url.split('/').pop()}.html`, html);
    }
    
    const $ = cheerio.load(html);
    const data = {
      // Core identification
      title: this.extractTitle($ as cheerio.CheerioAPI),
      detailUrl: url,
      
      // Descriptive information
      synopsis: this.extractSynopsis($ as cheerio.CheerioAPI),
      genres: this.extractGenres($ as cheerio.CheerioAPI),
      
      // Metadata
      episodes: this.extractEpisodeCount($ as cheerio.CheerioAPI),
      type: this.extractType($ as cheerio.CheerioAPI),
      releaseYear: parseInt(this.extractReleaseDate($ as cheerio.CheerioAPI), 10),
      status: this.extractStatus($ as cheerio.CheerioAPI),
      
      // Media
      image: this.extractImage($ as cheerio.CheerioAPI),
      
      // Add episode data
      episodeUrls: this.extractEpisodeUrls($ as cheerio.CheerioAPI, url),
    };

    this.cache.set(url, data);
    return data;
  }

  // Data extraction helpers
  private extractTitle($: cheerio.CheerioAPI): string {
    return $('h1.text-center.lg\\:text-start').text().trim();
  }

  private extractSynopsis($: cheerio.CheerioAPI): string {
    return $('h3:contains("Synopsis") + div').text().trim().replace(/\s+/g, ' ');
  }

  private extractGenres($: cheerio.CheerioAPI): string[] {
    return $('div.flex.flex-wrap.gap-2 a')
      .map((_, el) => $(el).text().trim())
      .get();
  }

  private extractReleaseDate($: cheerio.CheerioAPI): string {
    // Get the 4th span element within the flex container and extract the year
    const dateText = $('div.text-slate-100.text-xs.lg\\:text-base.flex.flex-wrap.justify-center.gap-2.sm\\:gap-6 > span')
      .eq(3)
      .find('span.inline-block')
      .text()
      .trim();
    const yearMatch = dateText.match(/\b(20\d{2})\b/);
    return yearMatch ? yearMatch[1] : '';
  }
  
  private extractStatus($: cheerio.CheerioAPI): string {
    // Find the status text within the specific flex container that has the SVG icon
    let statusText = $('span.inline-block:contains("Completed")').text().trim();
    if (!statusText) {
      statusText = $('span.inline-block:contains("Ongoing")').text().trim();
    }
    return statusText;
  }
  
  private extractEpisodeCount($: cheerio.CheerioAPI): number {
    // Try multiple selectors to find episode count
    const selectors = [
        'div.text-slate-100.text-xs.lg\\:text-base.flex.flex-wrap.justify-center.gap-2.sm\\:gap-6 > span:nth-child(3) span.inline-block',
        'div.flex.flex-wrap.gap-2 span:contains("Episodes") + span',
        'div.anime-info span:contains("Episodes") + span',
        'div.episode-count span', // Additional selector
        'div.info-section:contains("Episodes") + div' // Another common pattern
    ];

    for (const selector of selectors) {
        const episodeText = $(selector).text().trim();
        if (episodeText) {
            console.log(`Found episode text with selector ${selector}: ${episodeText}`);
            const episodeMatch = episodeText.match(/\d+/);
            if (episodeMatch) {
                return parseInt(episodeMatch[0], 10);
            }
        }
    }

    // If no episode count found, check if it's a movie or special
    const type = this.extractType($).toLowerCase();
    if (type === 'movie' || type === 'special' || type === 'ova') {
        return 1; // These types typically have 1 "episode"
    }

    console.warn('Could not find episode count, returning 0');
    return 0;
  }

  private extractType($: cheerio.CheerioAPI): string {
    // Get the 2nd span element within the flex container and extract the type
    return $('div.text-slate-100.text-xs.lg\\:text-base.flex.flex-wrap.justify-center.gap-2.sm\\:gap-6 > span')
      .eq(0)
      .find('span.inline-block')
      .text()
      .trim();
  }
  
  private extractImage($: cheerio.CheerioAPI): string {
    // Find the main anime image in the flex container
    const imageUrl = $('div.flex.items-start.flex-wrap.lg\\:flex-nowrap.gap-6 img')
      .first()
      .attr('src');
    
    // If no image found in the main container, try the alternative location
    return imageUrl || $('div.mx-auto.lg\\:mx-0 img').attr('src') || '';
  }

  private extractEpisodeUrls($: cheerio.CheerioAPI, baseUrl: string): string[] {
    try {
        const type = this.extractType($).toLowerCase();
        
        // Handle different types of anime
        if (['movie', 'special', 'ova', 'ona'].includes(type)) {
            console.log(`Detected ${type}, returning single episode URL`);
            return [`${baseUrl}/1`];
        }
        
        const episodeCount = this.extractEpisodeCount($);
        if (!episodeCount || episodeCount <= 0) {
            console.warn(`No episode count found for ${baseUrl}`);
            return [];
        }
        
        if (!baseUrl || !baseUrl.startsWith('http')) {
            console.warn(`Invalid base URL for episode URLs: ${baseUrl}`);
            return [];
        }
        
        // Ensure we generate exactly episodeCount URLs
        const episodeUrls: string[] = [];
        for (let i = 1; i <= episodeCount; i++) {
            const url = `${baseUrl}/${i}`;
            episodeUrls.push(url);
            if (episodeUrls.length >= episodeCount) {
                break; // Ensure we don't generate more than episodeCount
            }
        }
        
        // If we have fewer URLs than episodeCount, fill the remaining ones
        while (episodeUrls.length < episodeCount) {
            episodeUrls.push(`${baseUrl}/${episodeUrls.length + 1}`);
        }
        
        console.log(`Generated ${episodeUrls.length} episode URLs for ${baseUrl}`);
        return episodeUrls;
    } catch (error) {
        console.error(`Error generating episode URLs for ${baseUrl}:`, error);
        return [];
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}



// Usage
(async () => {
  try {
    const scraper = new AnizoneScraper(true);
    const animeData = await scraper.scrapeAllAnime();
    await Bun.write('anime-data-full.json', JSON.stringify(animeData, null, 2));
    console.log(`Saved ${animeData.length} anime records`);
  } catch (error) {
    console.error('Scraping failed:', error);
  }
})();

