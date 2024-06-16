import colors from "colors";
import { db  } from "../db";
import { apiKeys } from "../db/schema";
import { sql } from 'drizzle-orm' 

// ensure you import the schema for apiKeys
function generateUniqueHashedApiKey(): string {
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

async function addApiKeyToDrizzle(apiKey: string, name: string, isWhitelisted: boolean) {
  try {
    await db.insert(apiKeys).values({
      key: apiKey,
      name: name,
      whitelisted: isWhitelisted
    }).onConflictDoUpdate({
      target: apiKeys.key,
      set: {
        name: name,
        whitelisted: isWhitelisted
      }
    });
    await db.execute(sql`COMMIT`);
  } catch (error) {
    await db.execute(sql`ROLLBACK`);
    console.error(`Error adding API key to Drizzle: ${error}`);
  }
}

const newApiKey = generateUniqueHashedApiKey();
const apiKeyName = process.argv[2] || 'unknown';
const isWhitelisted = process.argv[3] === 'true' ? true : false;
await addApiKeyToDrizzle(newApiKey, apiKeyName, isWhitelisted);
console.log(colors.green(`New API key generated and stored: ${newApiKey} (Name: ${apiKeyName}) (Whitelisted: ${isWhitelisted})`));

process.exit();