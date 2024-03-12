import { CryptoHasher } from "bun";
import colors from "colors";
import { Pool } from "pg";
import { randomBytes } from "crypto";
import { getEnvVar } from "../utils/envUtils";


function generateUniqueHashedApiKey(): string {
  const timestamp = Date.now();
  const nonce = randomBytes(16).toString('hex').slice(0, 16);
  const uniquePart = `${timestamp}-${nonce}`;
  const hasher = new CryptoHasher('sha256');
  hasher.update(uniquePart);
  const hash = hasher.digest('hex');
  const key = `${timestamp}${hash.substring(0, 28)}`;
  return key;
}


async function addApiKeyToPostgres(apiKey: string, name: string) {
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
        name TEXT
      )`;
    await client.query(createTableText);
    const insertApiKeyText = `
      INSERT INTO api_keys (key, name) 
      VALUES ($1, $2) 
      ON CONFLICT (key) 
      DO NOTHING`;
    await client.query(insertApiKeyText, [apiKey, name]);
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
await addApiKeyToPostgres(newApiKey, apiKeyName);
console.log(colors.green(`New API key generated and stored: ${newApiKey} (Name: ${apiKeyName})`));


