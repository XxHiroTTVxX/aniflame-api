
import Gogoanime from "./gogo";
import { load } from "cheerio";
import axios from "axios";
import { Pool } from "pg";
import Redis from "ioredis";
import { getEnvVar } from "../../../utils/envUtils";
import { nanoid } from "nanoid";

const base = "https://anitaku.so";
const gogo = new Gogoanime(base, false);

// Initialize PostgreSQL pool
const pool = new Pool({
  connectionString: getEnvVar("POSTGRES_URL"),
});

// Initialize Redis client
const redisUrl = getEnvVar("REDIS_URL");
const cache = new Redis(redisUrl);
// Function to insert anime into PostgreSQL
const insertAnimeToDb = async (animeData: any) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const createTableText = `
CREATE TABLE IF NOT EXISTS anime (
  id VARCHAR(24) PRIMARY KEY,
  title TEXT NOT NULL,
  animeId VARCHAR(10000) UNIQUE NOT NULL,
  image TEXT,
  description TEXT,
  genres JSONB,
  released TEXT,
  status TEXT,
  type TEXT,
  episodes JSONB
);
    `;
    await client.query(createTableText);

    animeData.id = nanoid(10);

    const queryText = `
      INSERT INTO anime (id, title, animeId, image, description, genres, released, status, type, episodes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (animeId) DO NOTHING
    `;

    await client.query(queryText, [
      animeData.id,
      animeData.title,
      animeData.animeId,
      animeData.image,
      animeData.description,
      JSON.stringify(animeData.genres),
      animeData.released,
      animeData.status,
      animeData.type,
      JSON.stringify(animeData.episodes),
    ]);

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};



// Function to seed completed anime
const seedCompleted = async () => {
  for (let i = 0; i < 624; i++) {
    const res = await axios.get(`${base}/completed-anime.html?page=${i + 1}`);
    const $ = load(res.data);

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

// Function to seed ongoing anime
const seedOngoing = async () => {
  for (let i = 0; i < 31; i++) {
    const res = await axios.get(`${base}/ongoing-anime.html?page=${i + 1}`);
    const $ = load(res.data);

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
    await seedCompleted();
    await seedOngoing();

    console.log(
      "\n=====================\nFinished seeding\n=====================\n"
    );
    process.exit(0);
  })();
} else if (process.argv[2].toLowerCase() === "completed") {
  (async () => {
    await seedCompleted();
    process.exit(0);
  })();
} else if (process.argv[2].toLowerCase() === "ongoing") {
  (async () => {
    await seedOngoing();
    process.exit(0);
  })();
}
