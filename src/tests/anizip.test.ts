import { describe, test, expect, beforeEach } from "bun:test";
import AniZip from "../scrapers/info/anizip";

describe("AniZip Integration Tests", () => {
  let anizip: AniZip;

  beforeEach(() => {
    anizip = new AniZip();
  });

  describe("constructor", () => {
    test("should initialize with correct API endpoint", () => {
      expect(anizip).toBeInstanceOf(AniZip);
      // Access the protected api property for testing
      expect((anizip as any).api).toBe("https://api.ani.zip");
    });
  });

  describe("getInfo with real API", () => {
    test("should fetch One Piece data successfully", async () => {
      const result = await anizip.getInfo("anime", 21);

      // Log the titles
      console.log("One Piece titles:", result?.title);

      expect(result).not.toBeNull();
      expect(result).not.toBeNull();
      expect(result?.id).toBe(21);
      expect(result?.title).toBeDefined();
      expect(result?.mappings).toBeDefined();
      expect(result?.episodes).toBeDefined();
      expect(result?.specials).toBeDefined();

      // Verify the mappings are correct based on the API response
      expect(result?.mappings?.mal_id).toBe(21);
      expect(result?.mappings?.anidb_id).toBe(69);
      expect(result?.mappings?.thetvdb_id).toBe(81797);
      expect(result?.mappings?.imdb_id).toBe("tt0388629");

      // Check that episodes are properly formatted
      expect(result?.episodes).toBeDefined();
      expect(Array.isArray(result?.episodes)).toBe(true);
      expect(result?.episodes?.length).toBeGreaterThan(0);

      // Check that specials are properly formatted
      expect(result?.specials).toBeDefined();
      expect(Array.isArray(result?.specials)).toBe(true);
      expect(result?.specials?.length).toBeGreaterThan(0);

      // Verify episode structure
      if (result?.episodes && result.episodes.length > 0) {
        const firstEpisode = result.episodes[0];
        expect(firstEpisode).toMatchObject({
          number: expect.any(Number),
          title: expect.any(String),
          type: "episode"
        });
      }

      // Verify special structure
      if (result?.specials && result.specials.length > 0) {
        const firstSpecial = result.specials[0];
        expect(firstSpecial).toMatchObject({
          title: expect.any(String),
          type: "special"
        });
      }
    }, 30000); // 30 second timeout for API call

    test("should handle non-existent anime gracefully", async () => {
      const result = await anizip.getInfo("anime", 999999999);

      expect(result).toBeNull();
    }, 10000);

    test("should fetch Attack on Titan data successfully", async () => {
      const result = await anizip.getInfo("anime", 16498);

      // Log the titles
      console.log("Attack on Titan titles:", result?.title);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(16498);
      expect(result?.title).toBeDefined();
      expect(result?.mappings).toBeDefined();

      // Verify the mappings exist but don't check specific values (they may change)
      expect(result?.mappings?.mal_id).toBe(16498);
      expect(typeof result?.mappings?.anidb_id).toBe("number");
      expect(typeof result?.mappings?.thetvdb_id).toBe("number");
      expect(typeof result?.mappings?.imdb_id).toBe("string");
      expect(result?.mappings?.imdb_id).toMatch(/^tt\d+$/); // IMDB ID format
    }, 30000);

    test("should fetch Naruto data successfully", async () => {
      const result = await anizip.getInfo("anime", 20);

      // Log the titles
      console.log("Naruto titles:", result?.title);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(20);
      expect(result?.title).toBeDefined();
      expect(result?.mappings).toBeDefined();

      // Verify the mappings exist but don't check specific values (they may change)
      expect(result?.mappings?.mal_id).toBe(20);
      expect(typeof result?.mappings?.anidb_id).toBe("number");
      expect(typeof result?.mappings?.thetvdb_id).toBe("number");
      expect(typeof result?.mappings?.imdb_id).toBe("string");
      expect(result?.mappings?.imdb_id).toMatch(/^tt\d+$/); // IMDB ID format
    }, 30000);

    test("should properly sort episodes by number", async () => {
      const result = await anizip.getInfo("anime", 21); // One Piece

      expect(result?.episodes).toBeDefined();
      expect(Array.isArray(result?.episodes)).toBe(true);

      if (result?.episodes && result.episodes.length > 1) {
        // Check that episodes are sorted by number
        for (let i = 1; i < result.episodes.length; i++) {
          const prevEpisode = result.episodes[i - 1];
          const currentEpisode = result.episodes[i];
          
          if (prevEpisode.number !== null && currentEpisode.number !== null) {
            expect(prevEpisode.number).toBeLessThanOrEqual(currentEpisode.number);
          }
        }
      }
    }, 30000);

    test("should properly categorize episodes and specials", async () => {
      const result = await anizip.getInfo("anime", 21); // One Piece

      expect(result?.episodes).toBeDefined();
      expect(result?.specials).toBeDefined();

      // All episodes should have type "episode"
      result?.episodes?.forEach(episode => {
        expect(episode.type).toBe("episode");
      });

      // All specials should have type "special"
      result?.specials?.forEach(special => {
        expect(special.type).toBe("special");
      });

      // Episodes should have numeric numbers (or null)
      result?.episodes?.forEach(episode => {
        if (episode.number !== null) {
          expect(typeof episode.number).toBe("number");
        }
      });
    }, 30000);

    test("should handle anime with no episodes gracefully", async () => {
      // Try with a movie or OVA that might have no episodes
      const result = await anizip.getInfo("anime", 1); // Cowboy Bebop

      expect(result).not.toBeNull();
      expect(result?.episodes).toBeDefined();
      expect(result?.specials).toBeDefined();
      // Even if there are no episodes, the arrays should exist
      expect(Array.isArray(result?.episodes)).toBe(true);
      expect(Array.isArray(result?.specials)).toBe(true);
    }, 30000);
  });

  describe("API response validation", () => {
    test("should validate that API returns expected structure", async () => {
      const response = await fetch("https://api.ani.zip/mappings?anilist_id=21");
      const data = await response.json() as any;

      expect(data).toHaveProperty("titles");
      expect(data).toHaveProperty("episodes");
      expect(data).toHaveProperty("episodeCount");
      expect(data).toHaveProperty("specialCount");
      expect(data).toHaveProperty("images");
      expect(data).toHaveProperty("mappings");

      expect(typeof data.episodeCount).toBe("number");
      expect(typeof data.specialCount).toBe("number");
      expect(Array.isArray(data.images)).toBe(true);
      expect(typeof data.mappings).toBe("object");
    }, 10000);
  });
});
