// TODO: Implement animekai scraper
import { load } from 'cheerio';
import type { MediaInfo } from '../../../types/types';
import { AnimeScraper, type AnimeEpisode, type AnimeSource, type SearchResult } from '..';
import { MediaStatus, SubType, Format } from '../../../types/enums';
import { animeKaiExtractor } from '../../../lib/extractors';

type IntroOutro = {
  start: number;
  end: number;
};

/**
 * Scraper for animekai.to
 */
export class AnimeKai extends AnimeScraper {
  private readonly cdnUrl: string;
  
  constructor() {
    super('https://animekai.to');
    this.cdnUrl = 'https://animekai.to';
    
    // Set custom headers for this provider
    Object.assign(this.headers, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.7',
      'Referer': this.baseUrl,
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Connection': 'keep-alive',
      'Cache-Control': 'max-age=0'
    });
  }

  /**
   * Search for anime by title
   * @param query Search query
   * @param page Page number (optional)
   */
  async search(query: string, page: number = 1): Promise<SearchResult[]> {
    try {
      // Normalize search query
      const normalizedQuery = query.replace(/[\W_]+/g, '+');
      const url = `${this.baseUrl}/browser?keyword=${normalizedQuery}&page=${page}`;
      
      // Use fetch directly instead of fetchApi to handle HTML response
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      const $ = load(html);
      const results: SearchResult[] = [];
      
      // Parse search results
      $('.aitem').each((_, element) => {
        const id = $(element).find('a').attr('href')?.replace('/watch/', '') || '';
        const title = $(element).find('.title').text().trim();
        const image = $(element).find('img').attr('src');
        const type = $(element).find('.info').children().last()?.text().trim();
        
        // Extract other metadata when available
        const episodesElement = $(element).find('.info').children().eq(-2);
        const totalEpisodes = episodesElement.length ? parseInt(episodesElement.text().trim()) : undefined;
        
        if (id) {
          results.push({
            id,
            title,
            image,
            type,
            totalEpisodes
          });
        }
      });
      
      return results;
    } catch (error) {
      console.error('[AnimeKai] Search error:', error);
      return [];
    }
  }

  /**
   * Get detailed information about an anime
   * @param id Anime ID
   */
  async getInfo(id: string): Promise<MediaInfo> {
    try {
      const url = `${this.baseUrl}/watch/${id}`;
      
      // Use fetch directly instead of fetchApi to handle HTML response
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      const $ = load(html);
      
      // Basic info
      const title = $('.entity-scroll > .title').text().trim();
      const japaneseTitle = $('.entity-scroll > .title').attr('data-jp')?.trim();
      const image = $('div.poster > div > img').attr('src');
      const description = $('.entity-scroll > .desc').text().trim();
      
      // Extract genres
      const genres: string[] = [];
      $('.entity-scroll > .detail div:contains("Genres")').each((_, el) => {
        const genreText = $(el).text().trim();
        if (genreText && genreText.includes('Genres')) {
          $(el).find('a').each((_, genreLink) => {
            const genre = $(genreLink).text().trim();
            if (genre) genres.push(genre);
          });
        }
      });
      
      // Get episode count
      let episodeCount: number | undefined;
      try {
        const episodeList = $('.eplist ul li');
        episodeCount = episodeList.length || undefined;
      } catch (e) {
        console.error('[AnimeKai] Failed to extract episode count:', e);
      }
      
      // Create MediaInfo object
      const info: MediaInfo = {
        id: id,
        title: {
          english: title,
          romaji: title,
          native: japaneseTitle || null
        },
        coverImage: image || null,
        bannerImage: null,
        description,
        genres,
        characters: [],
        relations: [],
        episodeCount
      };
      
      return info;
    } catch (error) {
      console.error('[AnimeKai] GetInfo error:', error);
      throw error;
    }
  }

  /**
   * Get episodes for an anime
   * @param id Anime ID
   */
  async getEpisodes(id: string): Promise<AnimeEpisode[]> {
    try {
      const url = `${this.baseUrl}/watch/${id}`;
      
      // Use fetch directly instead of fetchApi to handle HTML response
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      const $ = load(html);
      const episodes: AnimeEpisode[] = [];
      
      // Find episode list directly from the HTML
      $('.eplist ul li').each((index, element) => {
        const episodeElement = $(element);
        const episodeLink = episodeElement.find('a');
        const episodeNumber = parseInt(episodeLink.attr('num') || `${index + 1}`);
        const episodeTitle = episodeLink.children('span').text().trim() || `Episode ${episodeNumber}`;
        const token = episodeLink.attr('token') || '';
        
        // Check if episode is filler
        const isFiller = episodeLink.hasClass('filler');
        
        // Create episode ID with token for source extraction
        const episodeId = token ? `${id}$ep=${episodeNumber}$token=${token}` : `${id}$ep=${episodeNumber}`;
        
        episodes.push({
          id: episodeId,
          number: episodeNumber,
          title: episodeTitle || undefined,
          isFiller
        });
      });
      
      // If no episodes found in HTML, try to extract from JavaScript data
      if (episodes.length === 0) {
        // Look for episode data in JavaScript objects
        const scriptContent = $('script:contains("anime_id")').html();
        if (scriptContent) {
          const animeIdMatch = scriptContent.match(/anime_id\s*=\s*['"](.*?)['"]/);
          const animeId = animeIdMatch ? animeIdMatch[1] : null;
          
          if (animeId) {
            // Try to fetch episodes with anime ID
            await this.fetchEpisodesAjax(id, animeId, episodes);
          }
        }
      }
      
      return episodes.sort((a, b) => a.number - b.number);
    } catch (error) {
      console.error('[AnimeKai] GetEpisodes error:', error);
      return [];
    }
  }

  /**
   * Fetch episodes via AJAX call if needed
   */
  private async fetchEpisodesAjax(id: string, animeId: string, episodes: AnimeEpisode[]): Promise<void> {
    try {
      const episodesUrl = `${this.baseUrl}/ajax/episodes/list?ani_id=${animeId}`;
      
      const response = await fetch(episodesUrl, {
        method: 'GET',
        headers: {
          ...this.headers,
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `${this.baseUrl}/watch/${id}`
        }
      });
      
      if (!response.ok) {
        return;
      }
      
      const data = await response.json() as { result?: string };
      if (!data.result) return;
      
      const $ = load(data.result);
      
      // Parse episode list
      $('div.eplist > ul > li > a').each((index, el) => {
        const episodeNumber = parseInt($(el).attr('num') || `${index + 1}`);
        const episodeTitle = $(el).children('span').text().trim() || `Episode ${episodeNumber}`;
        const token = $(el).attr('token') || '';
        
        // Check if episode is filler
        const isFiller = $(el).hasClass('filler');
        
        // Create episode ID with token for source extraction
        const episodeId = token ? `${id}$ep=${episodeNumber}$token=${token}` : `${id}$ep=${episodeNumber}`;
        
        episodes.push({
          id: episodeId,
          number: episodeNumber,
          title: episodeTitle || undefined,
          isFiller
        });
      });
    } catch (error) {
      console.error('[AnimeKai] FetchEpisodesAjax error:', error);
    }
  }

  /**
   * Get streaming sources for an episode
   * @param episodeId Episode ID
   */
  async getSources(episodeId: string): Promise<AnimeSource[]> {
    try {
      // Direct URL handling
      if (episodeId.startsWith('http')) {
        const url = new URL(episodeId);
        const sources = await animeKaiExtractor.extract(url.href);
        if (sources) {
          return [{
            url: sources,
            quality: this.extractQuality(sources),
            headers: { 'Referer': this.baseUrl }
          }];
        }
        return [];
      }
      
      // Parse episode ID to extract token
      const parts = episodeId.split('$');
      if (parts.length < 2) {
        throw new Error('Invalid episode ID format');
      }
      
      const animeId = parts[0];
      let episodeNumber = '1';
      let token = '';
      
      // Extract episode number and token if available
      for (const part of parts) {
        if (part.startsWith('ep=')) {
          episodeNumber = part.substring(3);
        } else if (part.startsWith('token=')) {
          token = part.substring(6);
        }
      }
      
      // If no token, we need to get the episode page first to find the video
      if (!token) {
        return await this.getSourcesFromEpisodePage(animeId, episodeNumber);
      }
      
      // Otherwise, use token to get sources
      return await this.getSourcesWithToken(animeId, episodeNumber, token);
    } catch (error) {
      console.error('[AnimeKai] GetSources error:', error);
      return [];
    }
  }

  /**
   * Get sources directly from episode page when token is not available
   */
  private async getSourcesFromEpisodePage(animeId: string, episodeNumber: string): Promise<AnimeSource[]> {
    try {
      const url = `${this.baseUrl}/watch/${animeId}?ep=${episodeNumber}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      const $ = load(html);
      
      // Find iframe or video source
      const iframe = $('iframe.embed-responsive-item');
      if (iframe.length) {
        const iframeSrc = iframe.attr('src');
        if (iframeSrc) {
          const streamUrl = await animeKaiExtractor.extract(iframeSrc);
          if (streamUrl) {
            return [{
              url: streamUrl,
              quality: this.extractQuality(streamUrl),
              type: 'hls',
              headers: { 'Referer': this.baseUrl }
            }];
          }
        }
      }
      
      // Look for video source in JavaScript data
      const scriptContent = $('script:contains("player.setup")').html();
      if (scriptContent) {
        const sourceMatch = scriptContent.match(/file:\s*['"](.*?)['"]/);
        if (sourceMatch && sourceMatch[1]) {
          return [{
            url: sourceMatch[1],
            quality: this.extractQuality(sourceMatch[1]),
            type: sourceMatch[1].includes('.m3u8') ? 'hls' : 'mp4',
            headers: { 'Referer': this.baseUrl }
          }];
        }
      }
      
      return [];
    } catch (error) {
      console.error('[AnimeKai] GetSourcesFromEpisodePage error:', error);
      return [];
    }
  }

  /**
   * Get sources using token
   */
  private async getSourcesWithToken(animeId: string, episodeNumber: string, token: string): Promise<AnimeSource[]> {
    try {
      // Request the links list first
      const linksUrl = `${this.baseUrl}/ajax/links/list?token=${token}`;
      
      const linksResponse = await fetch(linksUrl, {
        method: 'GET',
        headers: {
          ...this.headers,
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `${this.baseUrl}/watch/${animeId}?ep=${episodeNumber}`
        }
      });
      
      if (!linksResponse.ok) {
        throw new Error(`HTTP error! status: ${linksResponse.status}`);
      }
      
      const linksData = await linksResponse.json() as { result?: string };
      if (!linksData.result) return [];
      
      const $ = load(linksData.result);
      const sources: AnimeSource[] = [];
      
      // Get all server IDs for SUB (or fallback to any server)
      const serverItems = $(`.server-items .server`);
      
      // Process each server to get source URLs
      for (let i = 0; i < serverItems.length; i++) {
        const serverId = $(serverItems[i]).attr('data-lid');
        if (!serverId) continue;
        
        const sourceUrl = `${this.baseUrl}/ajax/links/view?id=${serverId}`;
        
        const sourceResponse = await fetch(sourceUrl, {
          method: 'GET',
          headers: {
            ...this.headers,
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': `${this.baseUrl}/watch/${animeId}?ep=${episodeNumber}`
          }
        });
        
        if (!sourceResponse.ok) continue;
        
        try {
          const sourceData = await sourceResponse.json() as { result?: string };
          if (!sourceData.result) continue;
          
          // Try to parse as JSON first
          try {
            const parsedData = JSON.parse(sourceData.result);
            if (parsedData && parsedData.url) {
              // Extract source URL
              const streamUrl = await animeKaiExtractor.extract(parsedData.url);
              if (streamUrl) {
                sources.push({
                  url: streamUrl,
                  quality: this.extractQuality(streamUrl),
                  type: 'hls',
                  headers: { 'Referer': this.baseUrl }
                });
                
                // We only need one working source
                break;
              }
            }
          } catch (e) {
            // If not valid JSON, try to extract URL from HTML
            const $$ = load(sourceData.result);
            const iframe = $$('iframe');
            if (iframe.length && iframe.attr('src')) {
              const streamUrl = await animeKaiExtractor.extract(iframe.attr('src')!);
              if (streamUrl) {
                sources.push({
                  url: streamUrl,
                  quality: this.extractQuality(streamUrl),
                  type: 'hls',
                  headers: { 'Referer': this.baseUrl }
                });
                
                // We only need one working source
                break;
              }
            }
          }
        } catch (error) {
          console.error('[AnimeKai] Source data parsing error:', error);
          continue;
        }
      }
      
      return sources;
    } catch (error) {
      console.error('[AnimeKai] GetSourcesWithToken error:', error);
      return [];
    }
  }
}

export default AnimeKai;
