import { db } from "../db";
import { apiKeys } from "../db/schema";

const keys = await db.select().from(apiKeys).limit(3);
console.log("API Keys:");
keys.forEach(key => console.log(`- ${key.key} (${key.name})`));
