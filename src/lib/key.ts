import colors from "colors";
import { Pool } from "pg";
import { getEnvVar } from "../utils/envUtils";

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


async function addApiKeyToPostgres(apiKey: string, name: string, isWhitelisted: boolean) {
  const pool = new Pool({
    connectionString: getEnvVar('POSTGRES_URL'),
  });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const createTableText = `
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY, 
        key TEXT UNIQUE, 
        name TEXT,
        whitelisted BOOLEAN
      )`;
    await client.query(createTableText);
    const insertApiKeyText = `
      INSERT INTO api_keys (key, name, whitelisted) 
      VALUES ($1, $2, $3) 
      ON CONFLICT (key) 
      DO UPDATE SET name = $2, whitelisted = $3`;
    await client.query(insertApiKeyText, [apiKey, name, isWhitelisted]);
    await client.query("COMMIT");
  } catch (error) {
    console.error(`Error adding API key to Postgres: ${error}`);
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
}

const newApiKey = generateUniqueHashedApiKey();
const apiKeyName = process.argv[2] || 'unknown';
const isWhitelisted = process.argv[3] === 'true' ? true : false;
await addApiKeyToPostgres(newApiKey, apiKeyName, isWhitelisted);
console.log(colors.green(`New API key generated and stored: ${newApiKey} (Name: ${apiKeyName}) (Whitelisted: ${isWhitelisted})`));