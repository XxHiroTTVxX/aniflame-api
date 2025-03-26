export abstract class VideoExtractor {
    protected abstract serverName: string;
    protected abstract host: string;
  
    abstract extract(url: string): Promise<string | null>;
  
    protected async fetchHtml(url: string, headers: Record<string, string> = {}): Promise<string> {
      try {
        const response = await fetch(url, {
          headers: {
            "Accept-Encoding": "gzip, deflate",
            "Referer": this.host,
            ...headers
          }
        });
  
        if (!response.ok) {
          throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
        }
  
        return await response.text();
      } catch (error) {
        console.error(`Error fetching ${url}:`, error);
        throw error;
      }
    }
} 