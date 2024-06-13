import { serial, text, pgTable } from "drizzle-orm/pg-core";

export const api_keys = {
  apiKeys: pgTable("api_keys", {
    id: serial("id").primaryKey(),
    key: text("key").unique(),
    name: text("name"),
    whitelisted: text("whitelisted").$type<boolean>(),
  }),
};

export const anime = {
    anime: pgTable("anime", {
        id: text("id").primaryKey(),
        title: text("title").notNull(),
        animeId: text("animeId").unique().notNull(),
        image: text("image"),
        description: text("description"),
        genres: text("genres").$type<any[]>(),
        released: text("released"),
        status: text("status"),
        type: text("type"),
        episodes: text("episodes").$type<any[]>(),
      }),
}


export const episode_relations = {
    
}

export const rate_limits = {
    rateLimits: pgTable("rate_limits", {
      key: text("key").primaryKey(),
      count: text("count").$type<number>(),
    }),
  };