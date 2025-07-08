import { describe, test, expect } from "bun:test";
import { AnizoneScraper } from "../scrapers/anime/anizone";

// We'll use 'Baki' as a test query (known to exist on anizone.to)
const testQuery = "One Piece";
const scraper = new AnizoneScraper(true); // Enable debug mode for test


describe("AnizoneScraper", () => {
  test("should search for anime and find results", async () => {
    const results = await scraper.search(testQuery);
    console.log(results);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  }, 15000);

  test("should get info for an anime", async () => {
    const results = await scraper.search(testQuery);
    const info = await scraper.getInfo(results[0].id);
    console.log(info);
    expect(info).toBeDefined();
  }, 15000);

  test("should get episodes for an anime", async () => {
    const results = await scraper.search(testQuery);
    const episodes = await scraper.getEpisodes(results[0].id);
    console.log(episodes);
    expect(episodes).toBeDefined();
  }, 15000);

  test("should get sources for an episode", async () => {
    const results = await scraper.search(testQuery);
    const episodes = await scraper.getEpisodes(results[0].id);
    const sources = await scraper.getSources(episodes[0].id);
    console.log(sources);
    expect(sources).toBeDefined();
  }, 15000);
});