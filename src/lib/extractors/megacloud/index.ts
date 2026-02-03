import { VideoExtractor } from '../video-extractor';

const CLIENT_KEY_PATTERN = /([a-zA-Z0-9]{48})|x: "([a-zA-Z0-9]{16})", y: "([a-zA-Z0-9]{16})", z: "([a-zA-Z0-9]{16})"};/;
const SOURCE_ID_PATTERN = /embed-2\/v3\/e-1\/([a-zA-Z0-9]+)\?/;

export class MegaCloud extends VideoExtractor {
  protected serverName = 'MegaCloud';
  protected host = 'https://megacloud.blog';

  async extract(url: string, maxRetries = 3, initialDelay = 1000): Promise<string | null> {
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        console.log(`[MegaCloud] Attempt ${retryCount + 1}/${maxRetries} for URL:`, url);



        const idMatch = url.match(SOURCE_ID_PATTERN);
        if (!idMatch) {
          throw new Error('Could not extract video ID from URL');
        }
        const videoId = idMatch[1];

        // Step 3: Call
        console.log('[MegaCloud] Extracting client key from embed page...');
        const clientKey = await this.extractClientKey(url);
        if (!clientKey) return null;
        console.log(`[MegaCloud] Got client key: ${clientKey.substring(0, 10)}...`);

        const apiUrl = `${this.host}/embed-2/v3/e-1/getSources?id=${videoId}&_k=${clientKey}`;
        console.log('[MegaCloud] Calling getSources API...');

        const response = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Referer': url,
            'Origin': this.host,
            'Accept': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json() as any;
        console.log('[MegaCloud] API response:', data);

        // Step 4: Extract HLS source
        if (!data.sources || !Array.isArray(data.sources) || data.sources.length === 0) {
          throw new Error('No sources in response');
        }

        // Find HLS source
        const hlsSource = data.sources.find((s: any) => s.type === 'hls' || s.file?.includes('.m3u8'));

        if (hlsSource && hlsSource.file) {
          console.log('[MegaCloud] Found HLS source:', hlsSource.file);
          return hlsSource.file;
        }

        // Fallback to first source
        if (data.sources[0]?.file) {
          console.log('[MegaCloud] Using first source:', data.sources[0].file);
          return data.sources[0].file;
        }

        throw new Error('No valid HLS source found');

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

  private async extractClientKey(embedUrl: string): Promise<string | null> {
    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Referer': this.host + '/',
        'Origin': this.host,
      }
    });

    const html = await response.text();

    // Check for "File not found" page
    if (html.includes('<title>File not found') || html.includes('File was deleted')) {
      console.log('[MegaCloud] Source file missing/deleted on provider.');
      return null; // Return null to indicate soft failure
    }

    // Strategy 1: Check for Meta Tag (New method)
    const metaMatch = html.match(/name="_gg_fb"\s+content="([a-zA-Z0-9]+)"/);
    if (metaMatch) {
      return metaMatch[1];
    }

    // Strategy 2: Check for regex patterns (Old method)
    const match = html.match(CLIENT_KEY_PATTERN);

    if (!match) {
      // Dump partial HTML to log for debugging if we fail repeatedly
      console.log(`[MegaCloud] HTML Dump: ${html.substring(0, 500)}`);
      throw new Error('Client key pattern not found in embed page');
    }

    // Filter out undefined and join
    const keyParts = match.slice(1).filter(Boolean);
    return keyParts.join('');
  }
}

// Create and export the extractor instance
export const megaCloudExtractor = new MegaCloud();
