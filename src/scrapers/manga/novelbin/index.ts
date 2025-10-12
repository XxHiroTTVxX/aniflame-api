import { MangaScraper } from "../index";
import type { MangaSearchResult } from "../index";
import type { Chapter } from "../../../types/types";
import * as cheerio from "cheerio";

function parseSearchResults(html: string): MangaSearchResult[] {
    const results: MangaSearchResult[] = [];
    // Match all <a ...> tags with class="list-group-item"
    const aTagRegex = /<a[^>]*class=["'][^"']*list-group-item[^"']*["'][^>]*>(.*?)<\/a>/gis;
    let match: RegExpExecArray | null;
    while ((match = aTagRegex.exec(html)) !== null) {
      const aTag = match[0];
      // Extract href and title attributes
      const hrefMatch = aTag.match(/href=["']([^"']+)["']/i);
      const titleMatch = aTag.match(/title=["']([^"']+)["']/i);
      if (!hrefMatch || !titleMatch) continue;
      const title = titleMatch[1].trim();
      if (title.toLowerCase().includes('see more results')) continue;
      results.push({
        id: hrefMatch[1],
        title,
        img: null,
        providerId: "novelbin",
      });
    }
    return results;
  }

export class NovelbinProvider extends MangaScraper {
  private initialized = false;
  private csrfToken?: string;
  private csrfCookie?: string;

  private static readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 5.1; rv:40.0) Gecko/20100101 Firefox/40.0';

  constructor() {
    super("https://novelbin.com");
  }

  async search(query: string): Promise<MangaSearchResult[]> {
    const url = `/ajax/search-novel?keyword=${encodeURIComponent(query)}`;
    const response = await fetch(`${this.baseUrl}${url}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch search results: ${response.status}`);
    }
    const html = await response.text();
    console.log("[NovelbinProvider] Raw HTML response:", html); // Debug log
    return parseSearchResults(html);
  }

  async fetchChapters(id: string): Promise<Chapter[]> {
    // Extract the slug from the id (which is a URL)
    const match = id.match(/([a-zA-Z0-9-]+)$/);
    const novelId = match ? match[1] : id;
    const url = `${this.baseUrl}/ajax/chapter-archive?novelId=${novelId}`;
    const response = await fetch(url, { headers: this.headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch chapters: ${response.status}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);
    const chapters: Chapter[] = [];
    $("a").each((i, el) => {
      const href = $(el).attr("href");
      const title = $(el).text().trim();
      if (href && title) {
        chapters.push({
          id: href.replace(/^\//, ""), // Remove leading slash if present
          title,
          number: i + 1,
          rating: null,
        });
      }
    });
    return chapters.reverse(); // Usually, the list is oldest first; reverse for newest first
  }

  async fetchPages(id: string): Promise<{ url: string; index: number; headers?: Record<string, string>; content: string }[]> {
    try {
      // Hardcoded values (as in test.ts)
      const csrfToken = 'hlkrI1xr-YaP6A9fdnU3YaNLQerL65RvAEuQ';
      const csrfCookie = 'K_n2bdQ016rSb6IC8jfzZWII';

      // Extract novelId and chapterId from id
      const urlParts = id.split('/');
      let novelId = '';
      let chapterId = '';
      if (urlParts.length >= 2) {
        novelId = urlParts[urlParts.length - 2];
        chapterId = urlParts[urlParts.length - 1];
      } else {
        chapterId = id;
      }

      const ajaxUrl = `${this.baseUrl}/ajax/show-full-content`;
      const formData = new URLSearchParams({
        novel_id: novelId,
        chapter_id: chapterId,
        _csrf: csrfToken,
      });
      const response = await fetch(ajaxUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': `_csrf=${csrfCookie};`,
        },
        body: formData.toString(),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to fetch chapter content: ${response.status} ${text}`);
      }
      const data = await response.json() as { success: boolean; content: string };
      if (!data.success || !data.content) {
        throw new Error('Failed to get chapter content from response');
      }
      // Transform HTML to description-like format

      const formattedContent = data.content;
      return [{
        url: '',
        index: 0,
        headers: undefined,
        content: formattedContent
      }];
    } catch (error) {
      console.error('[NovelbinProvider] fetchPages error:', error);
      throw error;
    }
  }


}
