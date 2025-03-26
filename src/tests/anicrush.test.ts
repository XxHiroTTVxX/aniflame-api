import { describe, expect, test } from "bun:test";
import { AnicrushScraper } from "../scrapers/anime/anicrush";

describe("AnicrushScraper", () => {
  const scraper = new AnicrushScraper(true); // Enable debug mode for testing
  const TIMEOUT = 10000; // 10 seconds timeout

  test("should search for anime", async () => {
    const results = await scraper.search("Jujutsu Kaisen");
    expect(Array.isArray(results)).toBe(true);
    
    if (results.length > 0) {
      const firstResult = results[0];
      expect(firstResult).toHaveProperty("id_number");
      expect(firstResult).toHaveProperty("name");
      expect(firstResult).toHaveProperty("total_episodes");
    }
  }, TIMEOUT);

  test("should handle empty search results", async () => {
    const results = await scraper.search("thisisanonexistentanime123456789");
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  }, TIMEOUT);

  test("should handle invalid anime ID for episode list", async () => {
    const episodes = await scraper.getEpisodeList("invalid-id");
    expect(Array.isArray(episodes)).toBe(true);
    expect(episodes.length).toBe(0);
  }, TIMEOUT);

  test("should handle invalid anime ID for servers", async () => {
    try {
      await scraper.getServers("invalid-id", "1");
    } catch (error) {
      expect(error).toBeTruthy();
    }
  }, TIMEOUT);

  test("should handle invalid anime ID for sources", async () => {
    try {
      await scraper.getSources("invalid-id", "1", "sub", undefined, true);
    } catch (error) {
      expect(error).toBeTruthy();
    }
  }, TIMEOUT);

  test("should handle invalid AniList ID mapping", async () => {
    const urls = await scraper.getAllEpisodeUrls("invalid-id", 1);
    expect(Array.isArray(urls)).toBe(true);
    expect(urls.length).toBe(0);
  }, TIMEOUT);

  // Test successful cases only if we have valid IDs
  if (process.env.ANICRUSH_TEST_ID) {
    const validId = process.env.ANICRUSH_TEST_ID;

    test("should get episode list for valid ID", async () => {
      const episodes = await scraper.getEpisodeList(validId);
      expect(Array.isArray(episodes)).toBe(true);
      
      if (episodes.length > 0) {
        const firstEpisode = episodes[0];
        expect(firstEpisode).toHaveProperty("epNum");
        expect(firstEpisode).toHaveProperty("name");
        expect(firstEpisode).toHaveProperty("url");
      }
    }, TIMEOUT);

    test("should get servers for valid ID", async () => {
      const servers = await scraper.getServers(validId, "1");
      expect(servers).toBeTruthy();
      expect(servers).toHaveProperty("status");
      expect(servers).toHaveProperty("result");
    }, TIMEOUT);

    test("should get sources for valid ID", async () => {
      const sources = await scraper.getSources(validId, "1", "sub", undefined, true);
      expect(sources).toBeTruthy();
      expect(sources).toHaveProperty("status", true);
      expect(sources.result).toHaveProperty("embed");
    }, TIMEOUT);

    test("should get HLS sources or fallback for valid ID", async () => {
      const sources = await scraper.getSources(validId, "1", "sub", "4", false);
      
      expect(sources.status).toBe(true);
      expect(sources.result).toBeDefined();

      // Check if we got HLS sources or fallback embed
      if (sources.result.sources) {
        // HLS source case
        expect(sources.result.sources).toBeInstanceOf(Array);
        expect(sources.result.sources[0].type).toBe("hls");
        expect(sources.result.sources[0].file).toMatch(/^https?:.*\.m3u8/);
        expect(sources.result.tracks).toBeInstanceOf(Array);
        expect(sources.result.server).toBe("megacloud");
      } else {
        // Fallback embed case
        expect(sources.result).toHaveProperty("embed");
        expect(sources.result.type).toBe("iframe");
        expect(sources.result.embed).toMatch(/^https?:.*megacloud/);
      }
    }, TIMEOUT);
  }
});
