export abstract class VideoExtractor {
  abstract extract(url: string): Promise<string | null>;
} 