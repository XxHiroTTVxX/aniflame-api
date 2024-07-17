
import { serial, text, pgTable,  uniqueIndex,varchar } from "drizzle-orm/pg-core";

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  key: text("key").unique(),
  name: text("name"),
  whitelisted: text("whitelisted").$type<boolean>(),
});

export const anime = pgTable(
  "anime",
  {
    id: varchar('id', { length: 24 }).primaryKey(),
    title: text("title").notNull(),
    image: text("image").notNull(),
    animeId: varchar('animeId', { length: 10000 }).unique().notNull(),
    type: text("type").notNull(),
    description: text("description").notNull(),
    genres: text("genres").notNull(),
    released: text("released").notNull(),
    status: text("status").notNull(),
    episodes: text("episodes").notNull(),
  },
  (animes) => ({
    animeIdx: uniqueIndex("animeIdx").on(animes.animeId),
    idx: uniqueIndex("idx").on(animes.id),
  })
);

export const rate_limits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: text("count").$type<number>(),
});