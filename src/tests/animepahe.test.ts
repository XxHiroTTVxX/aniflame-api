import { describe, test, expect } from "bun:test";
import { AnimePahe } from "../scrapers/anime/animePahe";

describe("AnimePahe Scraper", () => {
  const scraper = new AnimePahe();
  
  // We'll use "One Piece" as our test anime since it's long-running and likely to exist
  const testQuery = "One Piece";
  let animeId: string;

  // Helper function to retry failed requests
  const retry = async <T>(fn: () => Promise<T>, attempts = 3, delay = 1000): Promise<T> => {
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === attempts - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error("All retry attempts failed");
  };

  test("should search for anime", async () => {
    const results = await retry(async () => {
      const searchResults = await scraper.search(testQuery);
      expect(searchResults.length).toBeGreaterThan(0);
      return searchResults;
    });
    
    // Store the first result's ID for subsequent tests
    animeId = results[0].id;
    
    // Verify search result structure
    const firstResult = results[0];
    expect(firstResult).toHaveProperty("id");
    expect(firstResult).toHaveProperty("title");
    expect(firstResult).toHaveProperty("image");
    expect(typeof firstResult.id).toBe("string");
    expect(typeof firstResult.title).toBe("string");
  }, 10000);

  test("should get anime info", async () => {
    const info = await retry(async () => {
      const animeInfo = await scraper.getInfo(animeId);
      expect(animeInfo).toBeTruthy();
      return animeInfo;
    });
    
    // Test required MediaInfo fields
    expect(info).toHaveProperty("id");
    expect(info).toHaveProperty("title");
    expect(info.title).toHaveProperty("english");
    expect(info).toHaveProperty("coverImage");
    expect(info).toHaveProperty("description");
    expect(info).toHaveProperty("genres");
    expect(Array.isArray(info.genres)).toBe(true);
    
    // Test episodes array if available
    if (info.episodes) {
      expect(Array.isArray(info.episodes)).toBe(true);
      if (info.episodes.length > 0) {
        const episode = info.episodes[0];
        expect(episode).toHaveProperty("number");
        expect(episode).toHaveProperty("type");
        expect(episode.type).toBe("episode");
      }
    }
  }, 10000);

  test("should get episodes", async () => {
    const episodes = await retry(async () => {
      const eps = await scraper.getEpisodes(animeId);
      expect(eps.length).toBeGreaterThan(0);
      return eps;
    });

    // Test first episode structure
    const firstEpisode = episodes[0];
    expect(firstEpisode).toHaveProperty("id");
    expect(firstEpisode).toHaveProperty("number");
    expect(typeof firstEpisode.number).toBe("number");
  }, 10000);

  test("should get episode sources", async () => {
    // Get episodes first
    const episodes = await retry(async () => {
      const eps = await scraper.getEpisodes(animeId);
      expect(eps.length).toBeGreaterThan(0);
      return eps;
    });

    // Get sources for the first episode
    const firstEpisodeId = episodes[0].id;
    console.log("\nFetching sources for episode:", {
      episodeNumber: episodes[0].number,
      episodeId: firstEpisodeId
    });

    const sources = await retry(async () => {
      const src = await scraper.getSources(firstEpisodeId);
      expect(Array.isArray(src)).toBe(true);
      return src;
    });
    
    console.log("\nFound sources:", sources.length);
    sources.forEach((source, index) => {
      console.log(`\nSource #${index + 1}:`);
      console.log("Quality:", source.quality);
      console.log("Type:", source.type);
      console.log("URL:", source.url);
      if (source.headers) {
        console.log("Headers:", source.headers);
      }
    });
    
    if (sources.length > 0) {
      const source = sources[0];
      expect(source).toHaveProperty("url");
      expect(source).toHaveProperty("quality");
      expect(source).toHaveProperty("type");
      expect(typeof source.url).toBe("string");
      expect(typeof source.quality).toBe("string");
      expect(typeof source.type).toBe("string");

      // Test stream URL extraction
      console.log("\nTesting stream URL extraction for first source...");
      const streamUrl = await scraper.extractStreamUrl(source.url);
      console.log("Extracted stream URL:", streamUrl);
      
      if (streamUrl) {
        expect(streamUrl).toContain("https://");
        expect(streamUrl).toContain(".m3u8");
      }
    }
  }, 30000); // Increase timeout for source extraction
});
