import { expect, test } from "bun:test";
import Gogoanime from "../scrapers/anime/gogo";

test("Gogoanime Info", async () => {
  const gogo = new Gogoanime("https://anitaku.bz/");

  const result = await gogo.getEpisodeSource("tokidoki-bosotto-russia-go-de-dereru-tonari-no-alya-san-episode-1");
  console.log("Anime Info:", result);
  expect(result).toBeTruthy();
}, 60000);