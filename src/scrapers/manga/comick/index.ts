import { MangaScraper } from "../index";
import type { MangaSearchResult } from "../index";
import type { Chapter, Manga, MangaInfo, Artwork, Title } from "../../../types/types";
import { Genres, Format, MediaStatus, Type } from "../../../types/enums";

// Types for Comick API responses
interface ComickSearchResult {
  slug: string;
  title?: string;
  md_titles?: { title: string }[];
  md_covers?: { b2key: string }[];
  year?: number;
}

interface ComickChapter {
  hid: string;
  vol?: string;
  chap?: string;
  title?: string;
  lang?: string;
  up_count: number;
  down_count: number;
  updated_at?: string;
}

interface ComickChapterList {
  chapters: ComickChapter[];
}

interface ComickPage {
  vol: any;
  w: number;
  h: number;
  b2key: string;
}

interface ComickChapterDetail {
  chapter: {
    md_images: ComickPage[];
  };
}

interface ComickComic {
  comic: { hid: string };
}

export class ComickProvider extends MangaScraper {
  constructor() {
    super("https://api.comick.fun");
  }

  // Search for manga
  async search(query: string, format?: string, year?: number): Promise<MangaSearchResult[]> {
    try {
      const url = `/v1.0/search?q=${encodeURIComponent(query)}&limit=25&page=1${year ? `&from=${year}&to=${year}` : ""}`;
      const data = await this.fetchApi<ComickSearchResult[]>(url);
      return data.map((result) => {
        let cover = result.md_covers && result.md_covers[0] ? result.md_covers[0].b2key : null;
        if (cover) {
          cover = `https://meo.comick.pictures/${cover}`;
        }
        return {
          id: result.slug,
          title: result.title ?? result.slug,
          altTitles: result.md_titles ? result.md_titles.map((t) => t.title) : [],
          img: cover,
          format: format ?? "UNKNOWN",
          year: result.year ?? 0,
          providerId: "comick",
        };
      });
    } catch (error) {
      console.error("[ComickProvider] Search error:", error);
      return [];
    }
  }

  // Fetch chapters for a manga
  async fetchChapters(id: string): Promise<Chapter[]> {
    try {
      const comicId = await this.getComicId(`/comic/${id}`);
      if (!comicId) return [];
      const data = await this.fetchApi<ComickChapterList>(`/comic/${comicId}/chapters?lang=en&page=0&limit=1000000`);
      const chapters: Chapter[] = [];
      for (const chapter of data.chapters) {
        let title = "";
        if (chapter.vol) title += `Vol. ${this.padNum(chapter.vol, 2)} `;
        if (chapter.chap) title += `Ch. ${this.padNum(chapter.chap, 2)} `;
        if (!title) title = chapter.title || "Oneshot";
        if (chapter.lang === "en") {
          // Avoid duplicates by title
          if (!chapters.some((c) => c.title?.trim() === title.trim())) {
            chapters.push({
              id: chapter.hid,
              title: title.trim(),
              number: Number(chapter.chap),
              rating: chapter.up_count - chapter.down_count,
              updatedAt: chapter.updated_at ? new Date(chapter.updated_at).getTime() : undefined,
            });
          }
        }
      }
      return chapters;
    } catch (error) {
      console.error("[ComickProvider] fetchChapters error:", error);
      return [];
    }
  }

  // Fetch pages for a chapter
  async fetchPages(id: string): Promise<{ url: string; index: number; headers?: Record<string, string> }[]> {
    try {
      const data = await this.fetchApi<ComickChapterDetail>(`/chapter/${id}`);
      return data.chapter.md_images.map((image, index) => ({
        url: `https://meo.comick.pictures/${image.b2key}?width=${image.w}`,
        index,
        headers: {},
      }));
    } catch (error) {
      console.error("[ComickProvider] fetchPages error:", error);
      return [];
    }
  }

  /**
   * Fetch detailed manga info from Comick
   * @param media - Manga object (with mappings)
   * @returns MangaInfo or undefined
   */
  async info(media: Manga): Promise<MangaInfo | undefined> {
    // Find the Comick mapping ID
    const comickId = media.mappings.find((m) => m.providerId === "comick")?.id;
    if (!comickId) return undefined;

    try {
      // Fetch main comic data
      const comicReq = await fetch(`${this.baseUrl}/comic/${comickId}`, { headers: this.headers });
      if (!comicReq.ok) return undefined;
      const { comic: data } = (await comicReq.json()) as { comic: any };

      // Fetch covers
      const coversReq = await fetch(`${this.baseUrl}/comic/${comickId}/covers`, { headers: this.headers });
      const coversJson = coversReq.ok ? (await coversReq.json()) as { md_covers: any[] } : { md_covers: [] };
      const covers = coversJson.md_covers || [];

      // Artwork array
      const artwork: Artwork[] = covers.map((cover: any) => ({
        img: `https://meo.comick.pictures/${cover.b2key}`,
        type: "poster",
        providerId: "comick",
      }));

      // Cover image (prefer primary, fallback to first)
      const coverImage = covers.find((c: any) => c.is_primary)
        ? `https://meo.comick.pictures/${covers.find((c: any) => c.is_primary).b2key}`
        : covers[0]
        ? `https://meo.comick.pictures/${covers[0].b2key}`
        : data.md_covers && data.md_covers[0]
        ? `https://meo.comick.pictures/${data.md_covers[0].b2key}`
        : null;

      // Title object
      const title: Title = {
        english: data.md_titles?.find((t: any) => t.lang === "en")?.title || data.title || null,
        native: data.md_titles?.find((t: any) => t.lang === "ja")?.title || null,
        romaji: data.md_titles?.find((t: any) => t.lang === "ja-ro")?.title || null,
      };

      // Genres
      const genres: Genres[] = (data.md_comic_md_genres?.map((g: any) => g.md_genres.name) ?? []) as Genres[];
      // Tags
      const tags: string[] = data.mu_comics?.mu_comic_categories?.map((g: any) => g.mu_categories.title) ?? [];
      // Synonyms
      const synonyms: string[] = data.md_titles?.map((t: any) => t.title) ?? [];

      // Status mapping
      let status: MediaStatus | null = null;
      if (typeof data.status === "number") {
        status = data.status === 1 ? MediaStatus.FINISHED : MediaStatus.RELEASING;
      }

      // Format mapping (try to infer, fallback to UNKNOWN)
      let format: Format = Format.UNKNOWN;
      if (data.format) format = data.format;

      // Compose MangaInfo
      const info: MangaInfo = {
        id: String(data.slug),
        type: Type.MANGA,
        artwork,
        synonyms,
        totalChapters: data.chapter_count ?? null,
        bannerImage: null,
        coverImage,
        color: null,
        year: data.year ?? null,
        status,
        genres,
        description: data.parsed ?? data.desc ?? null,
        format,
        totalVolumes: data.total_volumes ?? null,
        countryOfOrigin: data.country ?? null,
        tags,
        relations: [],
        characters: [],
        title,
        rating: typeof data.bayesian_rating === "number" ? data.bayesian_rating : null,
        popularity: typeof data.user_follow_count === "number" ? data.user_follow_count : null,
        author: data.author ?? null,
        publisher: data.publisher ?? null,
      };
      return info;
    } catch (error) {
      console.error("[ComickProvider] info error:", error);
      return undefined;
    }
  }

  // Helper to get the comic ID from slug
  private async getComicId(id: string): Promise<string | null> {
    try {
      const json = await this.fetchApi<ComickComic>(id);
      return json.comic?.hid ?? null;
    } catch (error) {
      console.error("[ComickProvider] getComicId error:", error);
      return null;
    }
  }

  // Helper to pad numbers (e.g., 2 -> 02)
  private padNum(num: string | number, size: number): string {
    let s = String(num);
    while (s.length < size) s = "0" + s;
    return s;
  }
}



