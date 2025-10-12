import { describe, test, expect } from "bun:test";
import { NovelbinProvider } from "../scrapers/manga/novelbin";

// We'll use 'Baki' as a test query (known to exist on anizone.to)
const testQuery = "classroom";
const scraper = new NovelbinProvider(); // Enable debug mode for test


describe("NovelbinProvider", () => {
  test("should search for manga and find results", async () => {
    const results = await scraper.search(testQuery);
    console.log(results);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  }, 15000);

  test("should get chapters for a manga", async () => {
    const results = await scraper.search(testQuery);
    const chapters = await scraper.fetchChapters(results[4].id);
    console.log(chapters);
    expect(chapters).toBeDefined();
  }, 15000);

  test("should get pages for a chapter", async () => {
    const results = await scraper.search(testQuery);
    const chapters = await scraper.fetchChapters(results[4].id);
    const pages = await scraper.fetchPages(chapters[0].id);
    console.log(pages);
    expect(pages).toBeDefined();
  }, 15000);


});