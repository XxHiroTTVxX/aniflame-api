import { expect, test } from "bun:test";
import Gogoanime from "./anime/gogo/gogo";


test("Gogoanime Info", async () => {
  const gogo = new Gogoanime("https://anitaku.pe/");

  const result = await gogo.getEpisodeSource("shingeki-no-kyojin-episode-2");
  console.log("Anime Info:", result);
  expect(result).toBeTruthy();
});