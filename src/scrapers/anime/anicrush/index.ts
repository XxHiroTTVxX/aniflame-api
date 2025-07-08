import axios from 'axios';
import { megaCloudExtractor } from '../../../lib/extractors';

const CACHE_TTL = 60 * 60 * 24; // 24 hours

interface SearchResult {
  id_number: string;
  id: string;
  name: string;
  name_english?: string;
  total_episodes: number;
  episodes_uploaded: string;
  studios?: string[];
  mal_score?: number;
  released_year?: string;
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

export class AnicrushScraper {
  private isDebug = false;
  private baseUrl = 'https://api.anicrush.to/shared/v2';
  private webUrl = 'https://anicrush.to';

  constructor(debug = false) {
    this.isDebug = debug;
  }

  /**
   * Get common headers for API requests
   */
  private getCommonHeaders() {
    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': this.webUrl,
      'Referer': `${this.webUrl}/`,
      'x-site': 'anicrush'
    };
  }

  /**
   * Debug log with better formatting
   */
  private log(...args: any[]) {
    if (this.isDebug) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      console.log(`[${timestamp}] [AnicrushScraper]`, ...args);
    }
  }

  /**
   * Error log with better formatting
   */
  private error(...args: any[]) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.error(`[${timestamp}] [AnicrushScraper] ERROR:`, ...args);
  }

  /**
   * Success log for HLS stream extraction
   */
  private logHlsSuccess(hlsUrl: string) {
    if (this.isDebug) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      console.log(`[${timestamp}] [AnicrushScraper] ✅ HLS STREAM FOUND:`);
      console.log(`[${timestamp}] [AnicrushScraper] 📺 Stream URL: ${hlsUrl}`);
      console.log(`[${timestamp}] [AnicrushScraper] 🎯 Ready to play!`);
    }
  }

  /**
   * Step-by-step progress log
   */
  private logStep(step: string, details?: any) {
    if (this.isDebug) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      console.log(`[${timestamp}] [AnicrushScraper] 🔄 ${step}`);
      if (details) {
        console.log(`[${timestamp}] [AnicrushScraper] 📋 Details:`, details);
      }
    }
  }

  /**
   * Search for anime
   */
  async search(query: string): Promise<SearchResult[]> {
    try {
      this.log(`Searching for anime: ${query}`);
      
      const response = await axios.get(`${this.baseUrl}/movie/list`, {
        params: {
          keyword: query,
          page: 1,
          limit: 20
        },
        headers: this.getCommonHeaders()
      });
      
      if (!response.data || !response.data.status || !response.data.result || !response.data.result.movies) {
        this.error('Invalid search response:', response.data);
        return [];
      }
      
      this.log(`Found ${response.data.result.movies.length} results for query: ${query}`);
      return response.data.result.movies;
    } catch (error) {
      this.error('Error searching for anime:', error);
      return [];
    }
  }

  /**
   * Get episode list for an anime
   */
  async getEpisodeList(id: string): Promise<EpisodeListItem[]> {
    try {
      this.log(`Getting episode list for anime ID: ${id}`);
      
      const response = await axios.get(`${this.baseUrl}/episode/list`, {
        params: {
          _movieId: id
        },
        headers: this.getCommonHeaders()
      });
      
      if (!response.data || !response.data.result) {
        this.error('Invalid episode list response:', response.data);
        return [];
      }
      
      // Check if result is an array or an object
      let episodes: EpisodeListItem[] = [];
      if (Array.isArray(response.data.result)) {
        episodes = response.data.result;
      } else if (typeof response.data.result === 'object') {
        // If it's an object (like { "1": [...episodes], "2": [...episodes] })
        // Flatten all episodes into a single array
        episodes = Object.values(response.data.result).flat() as EpisodeListItem[];
      }
      
      this.log(`Found ${episodes.length} episodes for anime ID: ${id}`);
      
      // Sort episodes by episode number if we have episodes
      if (episodes.length > 0) {
        return episodes.sort((a: EpisodeListItem, b: EpisodeListItem) => {
          // Sort by episode number
          const epA = parseFloat(a.epNum);
          const epB = parseFloat(b.epNum);
          return epA - epB;
        });
      }
      
      return episodes;
    } catch (error) {
      this.error('Error getting episode list:', error);
      return [];
    }
  }

  /**
   * Get available servers for an episode
   */
  async getServers(id: string, episode: string): Promise<ServerListResponse> {
    try {
      this.log(`Getting servers for anime ID: ${id}, episode: ${episode}`);
      
      const response = await axios.get(`${this.baseUrl}/episode/servers`, {
        params: {
          _movieId: id,
          ep: episode
        },
        headers: this.getCommonHeaders()
      });
      
      if (!response.data) {
        throw new Error('Invalid server list response');
      }
      
      this.log(`Found servers for anime ID: ${id}, episode: ${episode}:`, response.data);
      return response.data;
    } catch (error) {
      this.error('Error getting servers:', error);
      throw error;
    }
  }

  /**
   * Get sources for an episode
   */
  async getSources(id: string, episode: string, subOrDub = 'sub', server?: string, skipHlsProcessing = false): Promise<any> {
    try {
      this.logStep(`Starting source extraction for anime ID: ${id}, episode: ${episode}`);
      this.logStep(`Parameters: subOrDub=${subOrDub}, server=${server || 'default'}, skipHls=${skipHlsProcessing}`);
      
      // Get the available servers first
      this.logStep('Step 1: Fetching available servers');
      const serversResponse = await this.getServers(id, episode);
      
      if (!serversResponse.status || !serversResponse.result) {
        throw new Error('No servers available');
      }
      
      // Use server 4 as default if not specified (from the user's code example)
      // Important: Looking at the API response, we need to use the 'server' property, not the 'id'
      const serverToUse = server || '4';
      
      // For the sc parameter, we need to use 'sub' or 'dub', not 0 or 1
      const scParam = subOrDub.toLowerCase() === 'sub' ? 'sub' : 'dub';
      
      this.logStep(`Step 2: Using server ${serverToUse} with type ${scParam}`);
      
      // Make the request to get the embed link
      this.logStep('Step 3: Requesting embed link from API');
      const sourcesResponse = await axios.get(`${this.baseUrl}/episode/sources`, {
        params: {
          _movieId: id,
          ep: episode,
          sv: serverToUse,
          sc: scParam
        },
        headers: this.getCommonHeaders()
      });
      
      if (!sourcesResponse.data || !sourcesResponse.data.status) {
        throw new Error('Failed to get sources');
      }
      
      // If result has an error type, throw an error
      if (sourcesResponse.data.result?.type === 'error') {
        throw new Error('API returned error response');
      }
      
      const embedLink = sourcesResponse.data.result?.link;
      
      if (!embedLink) {
        this.logStep('Embed link not found in primary location, checking alternatives');
        
        // Try to extract link from a different location in the response
        if (sourcesResponse.data.result?.sources?.link) {
          this.logStep('Found link in sources object');
          return sourcesResponse.data.result.sources.link;
        } else if (typeof sourcesResponse.data.result === 'string') {
          this.logStep('Result is a string, using as link');
          return sourcesResponse.data.result;
        }
        
        throw new Error('Embed link not found');
      }
      
      this.logStep(`Step 4: Found embed link: ${embedLink}`);
      
      // Option to skip HLS processing for testing
      if (skipHlsProcessing) {
        this.logStep('Skipping HLS processing - returning embed link directly');
        return {
          status: true,
          result: {
            embed: embedLink,
            type: sourcesResponse.data.result?.type || 'iframe'
          }
        };
      }
      
      // Get the HLS stream URL from the embed link
      this.logStep('Step 5: Extracting HLS stream from embed link');
      try {
        const hlsResponse = await this.getHlsLink(embedLink);
        
        if (!hlsResponse.status) {
          this.logStep('HLS extraction failed, using embed link as fallback');
          return {
            status: true,
            result: {
              embed: embedLink,
              type: sourcesResponse.data.result?.type || 'iframe'
            }
          };
        }
        
        // Log success with the HLS URL
        const hlsUrl = hlsResponse.result?.sources?.[0]?.file;
        if (hlsUrl) {
          this.logHlsSuccess(hlsUrl);
        }
        
        return hlsResponse;
      } catch (hlsError: any) {
        this.error('Error getting HLS link:', hlsError.message);
        this.logStep('HLS extraction error, using embed link as fallback');
        return {
          status: true,
          result: {
            embed: embedLink,
            type: sourcesResponse.data.result?.type || 'iframe'
          }
        };
      }
    } catch (error: any) {
      this.error('Error getting sources:', error.message);
      throw error;
    }
  }

  /**
   * Get HLS link from embed URL
   */
  private async getHlsLink(embedUrl: string) {
    try {
      if (!embedUrl) {
        throw new Error('Embed URL is required');
      }

      this.logStep(`Extracting HLS from embed URL: ${embedUrl}`);

      // Use megacloud extractor to get the sources
      this.logStep('Using MegaCloud extractor to get HLS stream');
      const embedSources = await megaCloudExtractor.extract(embedUrl);

      if (!embedSources) {
        throw new Error('No sources found');
      }

      this.logStep(`Successfully extracted HLS stream: ${embedSources.substring(0, 100)}...`);

      // Return the complete response
      return {
        status: true,
        result: {
          sources: [{
            file: embedSources,
            type: 'hls'
          }],
          tracks: [],
          intro: {
            start: 0,
            end: 0
          },
          outro: {
            start: 0,
            end: 0
          },
          server: 'megacloud'
        }
      };

    } catch (error: any) {
      this.error('Error getting HLS link:', error);
      return {
        status: false,
        error: error.message || 'Failed to get HLS link'
      };
    }
  }

  /**
   * Get all episode stream URLs for an anime
   */
  async getAllEpisodeUrls(id: string, episodeCount?: number): Promise<string[]> {
    try {
      // Get anime details
      const searchResults = await this.search(id);
      const mappedData = searchResults.find(item => item.id_number === id);
      
      if (!mappedData) {
        throw new Error(`Could not find anime with ID ${id}`);
      }
      
      // Get the episode list
      const episodes = await this.getEpisodeList(id);
      const maxEpisodes = episodeCount || (mappedData.total_episodes || episodes.length || 1);
      
      const streamUrls: string[] = [];
      
      // Get stream URL for each episode
      for (let episode = 1; episode <= maxEpisodes; episode++) {
        try {
          if (this.isDebug) {
            console.log(`Getting stream URL for episode ${episode}`);
          }
          
          const streamUrl = await this.getSources(id, episode.toString());
          
          // Add the stream URL to our array
          if (streamUrl) {
            streamUrls.push(streamUrl);
            if (this.isDebug) {
              console.log(`Successfully got stream URL for episode ${episode}`);
            }
          } else {
            // Push empty string to maintain episode index
            streamUrls.push('');
            if (this.isDebug) {
              console.log(`No stream URL found for episode ${episode}`);
            }
          }
        } catch (error) {
          console.error(`Error getting stream URL for episode ${episode}:`, error);
          // Push empty string for failed episodes to maintain the episode index
          streamUrls.push('');
        }
      }
      
      return streamUrls;
    } catch (error) {
      console.error('Error getting all episode URLs:', error);
      return [];
    }
  }

}

