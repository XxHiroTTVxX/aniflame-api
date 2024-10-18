
import Gogoanime from "../gogo";
import { load } from "cheerio";
import Redis from "ioredis";
import { getEnvVar } from "../../../utils/envUtils";
import { nanoid } from "nanoid";
import { db } from "../../../db";
import { anime } from "../../../db/schema";

const base = "https://anitaku.so";
const gogo = new Gogoanime(base, false);

// Initialize Redis 
const redisUrl = getEnvVar("REDIS_URL");
const cache = new Redis(redisUrl);

// Function to insert anime into PostgreSQL
const insertAnimeToDb = async (animeData: any) => {
  try {
    animeData.id = nanoid();

    await db.insert(anime).values({
      id: animeData.id,
      title: animeData.title,
      animeId: animeData.animeId,
      image: animeData.image,
      description: animeData.description,
      genres: JSON.stringify(animeData.genres),
      released: animeData.released,
      status: animeData.status,
      type: animeData.type,
      episodes: JSON.stringify(animeData.episodes),
    }).onConflictDoUpdate({ target: anime.animeId, set: {
      title: animeData.title,
      image: animeData.image,
      description: animeData.description,
      genres: JSON.stringify(animeData.genres),
      released: animeData.released,
      status: animeData.status,
      type: animeData.type,
      episodes: JSON.stringify(animeData.episodes),
    } });
  } catch (err) {
    console.error(`Error inserting anime into database: ${err}`);
  }
};

// Function to seed anime
const seedAnime = async (type: string, pages: number) => {
  for (let i = 0; i < pages; i++) {
    const res = await fetch(`${base}/${type}-anime.html?page=${i + 1}`);
    const text = await res.text();
    const $ = load(text);

    const ids: string[] = [];

    $('html body div#wrapper_inside div#wrapper div#wrapper_bg section.content section.content_left div.main_body div.last_episodes ul.items > li').each((i, el) => {
      const id = $(el)
        .find("p.name > a")
        .attr("href")
        ?.replace("/category/", "");
      if (id) {
        ids.push(id);
      }
    });

    console.log(`Got ${ids.length} ids from page ${i + 1} adding them to database and cache in 200ms`);

    await new Promise((resolve) => setTimeout(resolve, 200)); // Simulating delay

    const promises = ids.map(async (id) => {
      const animeInfo = await gogo.getAnimeInfo(id);
      await insertAnimeToDb(animeInfo);
      console.log(`Added ${animeInfo.title} to database`);
      await cache.set(`anime_info_${id}`, JSON.stringify(animeInfo), 'EX', 3600); // Example caching logic
    });

    await Promise.all(promises);

    console.log(`[Seed] Finished page ${i + 1}`);
  }
};

// Entry point
if (!process.argv[2]) {
  (async () => {
    await seedAnime("completed", 624);
    await seedAnime("ongoing", 31);

    console.log(
      "\n=====================\nFinished seeding\n=====================\n"
    );
    process.exit(0);
  })();
} else if (process.argv[2].toLowerCase() === "completed") {
  (async () => {
    await seedAnime("completed", 624);
    process.exit(0);
  })();
} else if (process.argv[2].toLowerCase() === "ongoing") {
  (async () => {
    await seedAnime("ongoing", 31);
    process.exit(0);
  })();
}
