import { CryptoHasher } from "bun";
import { Database } from "bun:sqlite";
import { randomBytes } from "crypto";

function generateUniqueHashedApiKey(): string {
  const timestamp = Date.now();
  const nonce = randomBytes(16).toString('hex').slice(0, 16);
  const uniquePart = `${timestamp}-${nonce}`; // Assuming this is the correct way to generate your unique part
  const hasher = new CryptoHasher('sha256');
  hasher.update(uniquePart);
  const hash = hasher.digest('hex');
  const key = `${timestamp}${hash.substring(0, 28)}`;
  return key;
}

async function addApiKeyToSQLite(apiKey: string, dbPath: string) {
  const db = new Database(dbPath);
  try {
    db.exec("BEGIN TRANSACTION;");
    db.exec("CREATE TABLE IF NOT EXISTS api_keys (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT)");
    const insert = db.prepare("INSERT INTO api_keys (key) VALUES (?)");
    insert.run(apiKey);
    db.exec("COMMIT;");
  } catch (error) {
    console.error(`Error adding API key to SQLite: ${error}`);
    db.exec("ROLLBACK;");
  } finally {
    db.close();
  }
}

const newApiKey = generateUniqueHashedApiKey();
await addApiKeyToSQLite(newApiKey, './apiKeys.db');
console.log(`\x1b[32mNew API key generated and stored: ${newApiKey}\x1b[0m`);