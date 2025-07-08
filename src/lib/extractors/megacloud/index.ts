import { VideoExtractor } from '../video-extractor';
import { getSources } from './newExtractor';

interface Track {
  file: string;
  label: string;
  kind: string;
}

interface StreamData {
  sources: Array<{
    file: string;
    type: string;
  }>;
  tracks: Track[];
  intro?: {
    start: number;
    end: number;
  };
  outro?: {
    start: number;
    end: number;
  };
}

export class MegaCloud extends VideoExtractor {
  protected serverName = 'MegaCloud';
  protected host = 'https://anicrush.to';

  async extract(url: string, maxRetries = 3, initialDelay = 1000): Promise<string | null> {
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        console.log(`[MegaCloud] Attempt ${retryCount + 1}/${maxRetries} for URL:`, url);
        const embedUrl = new URL(url);
        const referer = this.host;

        console.log('[MegaCloud] Calling getSources...');
        const response = await getSources(embedUrl.href, referer);
        console.log('[MegaCloud] Response from getSources:', response);
        
        if (typeof response !== 'object' || response === null || !Array.isArray((response as any).sources)) {
          console.log('[MegaCloud] Invalid response structure:', response);
          throw new Error(`Invalid response from getSources for ${url}`);
        }

        const data = response as unknown as StreamData;
        console.log('[MegaCloud] Parsed data sources:', data.sources);

        // Return the first HLS source URL if available
        const hlsSource = data.sources.find(s => s.type === 'hls');
        console.log('[MegaCloud] Found HLS source:', hlsSource);
        return hlsSource ? hlsSource.file : null;

      } catch (error) {
        console.error(`[MegaCloud] Error on attempt ${retryCount + 1}:`, error);
        
        if (retryCount === maxRetries - 1) {
          console.error("[MegaCloud] All retry attempts failed");
          return null;
        }
        
        // Exponential backoff
        const delay = initialDelay * Math.pow(2, retryCount);
        console.log(`[MegaCloud] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
      }
    }
    
    return null;
  }
}

// Create and export the extractor instance
export const megaCloudExtractor = new MegaCloud();
