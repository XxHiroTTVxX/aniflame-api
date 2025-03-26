import { VideoExtractor } from './video-extractor';

export class Kwik extends VideoExtractor {
  protected serverName = 'kwik';
  protected host = 'https://animepahe.ru';

  async extract(url: string): Promise<string | null> {
    try {
      const text = await this.fetchHtml(url);

      // Look for the eval pattern in the response
      const match = /(eval)(\(function[\s\S]*?)(<\/script>)/s.exec(text);

      if (match && match[2]) {
        try {
          // Unpack and evaluate the code to extract the m3u8 URL
          const link = eval(match[2].replace("eval", "")).match(/https.*?m3u8/);
          return link ? link[0] : null;
        } catch (evalError) {
          console.error("Error unpacking code:", evalError);
          return null;
        }
      }

      return null;
    } catch (error) {
      console.error("Error extracting stream URL:", error);
      return null;
    }
  }
}

// Create and export the extractor instance
export const kwikExtractor = new Kwik();
