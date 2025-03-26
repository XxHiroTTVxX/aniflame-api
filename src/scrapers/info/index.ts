import type { MediaInfo } from "../../types/types";

export abstract class InfoScraper {
  protected readonly api: string;

  constructor(apiEndpoint: string) {
    this.api = apiEndpoint;
  }

  abstract getInfo(mediaType: string, mediaId: number): Promise<MediaInfo | null>;
  protected abstract formatData(data: any): MediaInfo;
}
