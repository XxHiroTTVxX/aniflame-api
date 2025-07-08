import { describe, test, expect } from "bun:test";
import { ComickProvider } from "../scrapers/manga/comick";

// We'll use 'Baki' as a test query (known to exist on anizone.to)
const testQuery = "One Piece";
const scraper = new ComickProvider(); // Enable debug mode for test


describe("ComickProvider", () => {
  test("should search for manga and find results", async () => {
    const results = await scraper.search(testQuery);
    console.log(results);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  }, 15000);

  test("should get chapters for a manga", async () => {
    const results = await scraper.search(testQuery);
    const chapters = await scraper.fetchChapters(results[0].id);
    console.log(chapters);
    expect(chapters).toBeDefined();
  }, 15000);

  test("should get pages for a chapter", async () => {
    const results = await scraper.search(testQuery);
    const chapters = await scraper.fetchChapters(results[0].id);
    const pages = await scraper.fetchPages(chapters[0].id);
    console.log(pages);
    expect(pages).toBeDefined();
  }, 15000);
});