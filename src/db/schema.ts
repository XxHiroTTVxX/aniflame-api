import { serial, text, pgTable, boolean,  uniqueIndex,varchar, timestamp, integer, date, primaryKey } from "drizzle-orm/pg-core";

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  key: text("key").unique(),
  name: text("name"),
  whitelisted: boolean("whitelisted").default(false).notNull(),
  discordId: text("discord_id").unique(),
  monthlyLimit: integer("monthly_limit").default(1000).notNull(),
  currentMonthUsage: integer("current_month_usage").default(0).notNull(),
  lastResetDate: timestamp("last_reset_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  blacklistedIPs: text('blacklisted_ips').array().default([]),
  allowedEndpoints: text('allowed_endpoints').array().default([])
});

export const apiUsageLog = pgTable("api_usage_log", {
  id: serial("id").primaryKey(),
  keyId: integer("key_id").notNull().references(() => apiKeys.id),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  endpoint: text("endpoint"), // Optional: track which endpoint was accessed
  status: integer("status"), // Optional: track HTTP status code
  clientIp: text("client_ip").notNull(),
});

export const hourlyApiUsage = pgTable("hourly_api_usage", {
  id: serial("id").primaryKey(),
  keyId: integer("key_id").notNull().references(() => apiKeys.id),
  date: date("date").notNull(),
  hour: integer("hour").notNull(), // 0-23 for the hour of day
  count: integer("count").notNull().default(0),
}, (table) => {
  return {
    // Create a unique constraint on keyId + date + hour
    keyDateHourIdx: uniqueIndex("key_date_hour_idx").on(table.keyId, table.date, table.hour)
  };
});

export const anime = pgTable("anime", {
  id: varchar("id", { length: 64 }).primaryKey(),
  anilistId: text("anilist_id"),
  title: text("title").notNull(),
  image: text("image").notNull(),
  animeId: varchar("animeId", { length: 10000 }).notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  genres: text("genres").array().notNull(),
  released: integer("released").default(0).notNull(),
  status: text("status").notNull(),
  episodes: integer("episodes").default(0).notNull(),
  episodeUrls: text('episode_urls').array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const routes = pgTable("routes", {
  path: text("path").primaryKey(),
  rateLimit: text("rate_limit").$type<number>(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique(),
  password: text("password")
});