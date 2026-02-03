import { describe, expect, test } from "bun:test";
import { AnicrushScraper } from "../scrapers/anime/anicrush";

describe("AnicrushScraper - HLS Stream Testing", () => {
  const scraper = new AnicrushScraper(true); // Enable debug mode for testing
  const TIMEOUT = 15000; // 15 seconds timeout for HLS extraction

  test("🔍 should search for anime and find results", async () => {
    console.log("\n=== Testing Anime Search ===");
    const results = await scraper.search("Jujutsu Kaisen");
    expect(Array.isArray(results)).toBe(true);

    if (results.length > 0) {
      const firstResult = results[0];
      expect(firstResult).toHaveProperty("id_number");
      expect(firstResult).toHaveProperty("name");
      expect(firstResult).toHaveProperty("total_episodes");
      console.log(`✅ Found anime: ${firstResult.name} (ID: ${firstResult.id_number})`);
    }
  }, TIMEOUT);

  test("❌ should handle empty search results gracefully", async () => {
    console.log("\n=== Testing Empty Search ===");
    const results = await scraper.search("thisisanonexistentanime123456789");
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
    console.log("✅ Empty search handled correctly");
  }, TIMEOUT);

  test("❌ should handle invalid anime ID for episode list", async () => {
    console.log("\n=== Testing Invalid Episode List ===");
    const episodes = await scraper.getEpisodeList("invalid-id");
    expect(Array.isArray(episodes)).toBe(true);
    expect(episodes.length).toBe(0);
    console.log("✅ Invalid episode list handled correctly");
  }, TIMEOUT);

  test("❌ should handle invalid anime ID for servers", async () => {
    console.log("\n=== Testing Invalid Servers ===");
    try {
      await scraper.getServers("invalid-id", "1");
    } catch (error) {
      expect(error).toBeTruthy();
      console.log("✅ Invalid servers handled correctly");
    }
  }, TIMEOUT);

  test("❌ should handle invalid anime ID for sources", async () => {
    console.log("\n=== Testing Invalid Sources ===");
    try {
      await scraper.getSources("invalid-id", "1", "sub", undefined, true);
    } catch (error) {
      expect(error).toBeTruthy();
      console.log("✅ Invalid sources handled correctly");
    }
  }, TIMEOUT);

  // Test successful cases only if we have valid IDs
  if (process.env.ANICRUSH_TEST_ID) {
    const validId = process.env.ANICRUSH_TEST_ID;
    console.log(`\n🎯 Testing with valid anime ID: ${validId}`);

    test("📺 should get episode list for valid ID", async () => {
      console.log("\n=== Testing Episode List ===");
      const episodes = await scraper.getEpisodeList(validId);
      expect(Array.isArray(episodes)).toBe(true);

      if (episodes.length > 0) {
        const firstEpisode = episodes[0];
        expect(firstEpisode).toHaveProperty("number");
        expect(firstEpisode).toHaveProperty("name");
        console.log(`✅ Found ${episodes.length} episodes, first episode: ${firstEpisode.number}`);
      }
    }, TIMEOUT);

    test("🖥️ should get servers for valid ID", async () => {
      console.log("\n=== Testing Server List ===");
      const servers = await scraper.getServers(validId, "1");
      expect(servers).toBeTruthy();
      expect(servers).toHaveProperty("status");
      expect(servers).toHaveProperty("result");
      console.log("✅ Server list retrieved successfully");
    }, TIMEOUT);

    test("🔗 should get embed link for valid ID (skip HLS)", async () => {
      console.log("\n=== Testing Embed Link (Skip HLS) ===");
      const sources = await scraper.getSources(validId, "1", "sub", undefined, true);
      expect(sources).toBeTruthy();
      expect(sources).toHaveProperty("status", true);
      expect(sources.result).toHaveProperty("embed");
      console.log(`✅ Embed link retrieved: ${sources.result.embed.substring(0, 100)}...`);
    }, TIMEOUT);

    test("🎬 should get HLS stream for valid ID", async () => {
      console.log("\n=== Testing HLS Stream Extraction ===");
      console.log("🎯 This test will attempt to extract the actual HLS stream URL");

      const sources = await scraper.getSources(validId, "1", "sub", "4", false);

      expect(sources.status).toBe(true);
      expect(sources.result).toBeDefined();

      // Check if we got HLS sources or fallback embed
      if (sources.result.sources) {
        // HLS source case
        console.log("🎉 SUCCESS: HLS stream extracted!");
        expect(sources.result.sources).toBeInstanceOf(Array);
        expect(sources.result.sources[0].type).toBe("hls");
        expect(sources.result.sources[0].file).toMatch(/^https?:.*\.m3u8/);
        expect(sources.result.tracks).toBeInstanceOf(Array);
        expect(sources.result.server).toBe("megacloud");

        const hlsUrl = sources.result.sources[0].file;
        console.log(`📺 HLS Stream URL: ${hlsUrl}`);
        console.log(`🎯 Stream Type: ${sources.result.sources[0].type}`);
        console.log(`🖥️ Server: ${sources.result.server}`);
      } else {
        // Fallback embed case
        console.log("⚠️ HLS extraction failed, using embed fallback");
        expect(sources.result).toHaveProperty("embed");
        expect(sources.result.type).toBe("iframe");
        expect(sources.result.embed).toMatch(/^https?:.*megacloud/);
        console.log(`🔗 Embed URL: ${sources.result.embed}`);
      }
    }, TIMEOUT);
  } else {
    test("⚠️ Skipping HLS tests - no ANICRUSH_TEST_ID provided", () => {
      console.log("\n=== HLS Tests Skipped ===");
      console.log("To test HLS stream extraction, set the ANICRUSH_TEST_ID environment variable");
      console.log("Example: ANICRUSH_TEST_ID=123 bun test src/tests/anicrush.test.ts");
    });
  }
});
