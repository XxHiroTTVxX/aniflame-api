import type { IMangaInfo, IMangaChapter } from "../../../types/types";
import { MangaStatus, MangaFormat } from "../../../types/types";

export class MangaDexProvider {
  private readonly baseUrl = "https://api.mangadex.org";
  private readonly headers = {
    "User-Agent": "AniFlame/1.0.0",
    "Accept": "application/json"
  };

  private async fetchApi<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: this.headers
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  private async fetchChapters(mangaId: string, offset: number = 0): Promise<IMangaChapter[]> {
    try {
      const data = await this.fetchApi<any>(
        `/manga/${mangaId}/feed?limit=100&offset=${offset}&order[chapter]=asc&translatedLanguage[]=en`
      );

      return data.data.map((chapter: any) => ({
        id: chapter.id,
        number: Number(chapter.attributes.chapter) || 0,
        title: chapter.attributes.title,
        volume: chapter.attributes.volume,
        pages: chapter.attributes.pages,
        language: chapter.attributes.translatedLanguage,
        hash: chapter.attributes.hash,
        dataSaver: chapter.attributes.dataSaver,
        uploader: chapter.attributes.uploader,
        externalUrl: chapter.attributes.externalUrl,
        publishAt: chapter.attributes.publishAt,
        readableAt: chapter.attributes.readableAt,
        createdAt: chapter.attributes.createdAt,
        updatedAt: chapter.attributes.updatedAt
      }));
    } catch (err) {
      console.error(`Error fetching chapters for ${mangaId}:`, err);
      return [];
    }
  }

  public async getMangaInfo(id: string): Promise<IMangaInfo> {
    try {
      const data = await this.fetchApi<any>(
        `/manga/${id}?includes[]=author&includes[]=artist&includes[]=cover_art`
      );

      const manga = data.data;
      const attributes = manga.attributes;

      // Get all chapters
      const chapters: IMangaChapter[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const newChapters = await this.fetchChapters(id, offset);
        if (newChapters.length === 0) {
          hasMore = false;
        } else {
          chapters.push(...newChapters);
          offset += 100;
        }
      }

      // Map status
      let status = MangaStatus.UNKNOWN;
      switch (attributes.status) {
        case "ongoing":
          status = MangaStatus.ONGOING;
          break;
        case "completed":
          status = MangaStatus.COMPLETED;
          break;
        case "hiatus":
          status = MangaStatus.HIATUS;
          break;
        case "cancelled":
          status = MangaStatus.CANCELLED;
          break;
      }

      // Map format
      let format = MangaFormat.UNKNOWN;
      switch (attributes.originalLanguage) {
        case "ja":
          format = MangaFormat.MANGA;
          break;
        case "ko":
          format = MangaFormat.MANHWA;
          break;
        case "zh":
          format = MangaFormat.MANHUA;
          break;
      }

      // Get authors and artists
      const relationships = data.data.relationships || [];
      const authors = relationships
        .filter((rel: any) => rel.type === "author")
        .map((author: any) => author.attributes?.name)
        .filter(Boolean);

      const artists = relationships
        .filter((rel: any) => rel.type === "artist")
        .map((artist: any) => artist.attributes?.name)
        .filter(Boolean);

      // Get cover art
      const coverFile = relationships
        .find((rel: any) => rel.type === "cover_art")
        ?.attributes?.fileName;

      const coverUrl = coverFile ? `https://uploads.mangadex.org/covers/${id}/${coverFile}` : undefined;

      return {
        id: manga.id,
        title: attributes.title.en || Object.values(attributes.title)[0],
        altTitles: attributes.altTitles,
        description: attributes.description.en || Object.values(attributes.description)[0],
        authors,
        artists,
        genres: attributes.tags
          .filter((tag: any) => tag.attributes.group === "genre")
          .map((tag: any) => tag.attributes.name.en),
        themes: attributes.tags
          .filter((tag: any) => tag.attributes.group === "theme")
          .map((tag: any) => tag.attributes.name.en),
        status,
        format,
        version: attributes.version,
        language: attributes.originalLanguage,
        lastVolume: attributes.lastVolume,
        lastChapter: attributes.lastChapter,
        publicationDemographic: attributes.publicationDemographic,
        chapters,
        createdAt: attributes.createdAt,
        updatedAt: attributes.updatedAt
      };
    } catch (err) {
      throw new Error((err as Error).message);
    }
  }

  public async getChapterPages(chapterId: string): Promise<string[]> {
    try {
      const data = await this.fetchApi<any>(
        `/at-home/server/${chapterId}`
      );

      const baseUrl = data.baseUrl;
      const chapter = data.chapter;
      const hash = chapter.hash;

      return chapter.data.map(
        (page: string) => `${baseUrl}/data/${hash}/${page}`
      );
    } catch (err) {
      console.error(`Error fetching chapter pages for ${chapterId}:`, err);
      return [];
    }
  }
}

// Create and export the provider instance
export const mangaDexProvider = new MangaDexProvider(); 