import { expect, test } from "bun:test";
import Gogoanime from "../scrapers/anime/gogo";

test("Gogoanime Info", async () => {
  const gogo = new Gogoanime("https://anitaku.pe/");

  const result = await gogo.getEpisodeSource("shingeki-no-kyojin-episode-9");
  console.log("Anime Info:", result);
  expect(result).toBeTruthy();
});