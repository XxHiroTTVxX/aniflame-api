import { db  } from "../db";
import { apiKeys } from "../db/schema";
import { sql } from 'drizzle-orm' 
import { eq } from 'drizzle-orm'

// ensure you import the schema for apiKeys
export function generateUniqueHashedApiKey(): string {
  const timestamp = Date.now().toString();
  const array = new Uint8Array(16);
  const nonce = crypto.getRandomValues(array);

  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(timestamp);

  const nonceHex = Array.from(nonce).map(b => b.toString(16).padStart(2, '0')).join('');
  hasher.update(nonceHex);
  
  const hash = hasher.digest('hex');
  const key = `${timestamp}${hash.substring(0, 28)}`;
  return key;
}



export async function generateAndStoreKey(discordId: string, name: string = 'unknown', isWhitelisted: boolean = false) {
    // Check if user already has a key
    const existingKey = await db.select()
        .from(apiKeys)
        .where(eq(apiKeys.discordId, discordId))
        .limit(1);

    if (existingKey.length > 0) {
        return existingKey[0].key;
    }

    const newApiKey = generateUniqueHashedApiKey();
    //@ts-ignore
    await db.insert(apiKeys).values({
        key: newApiKey,
        name,
        isWhitelisted,
        discordId
    });
    return newApiKey;
}