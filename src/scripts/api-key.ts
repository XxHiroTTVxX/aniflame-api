import { CryptoHasher } from "bun";
import { Database } from "bun:sqlite";

function generateUniqueHashedApiKey(): string {
  const uniquePart = `${Date.now()}-${Math.random()}`;
  const hasher = new CryptoHasher('sha256');
  hasher.update(uniquePart);
  return hasher.digest('hex');
}

async function addApiKeyToSQLite(apiKey: string, dbPath: string) {
  const db = new Database(dbPath);
  db.exec(`CREATE TABLE IF NOT EXISTS api_keys (key TEXT)`);
  db.run(`INSERT INTO api_keys (key) VALUES (?)`, [apiKey]);
  db.close();
}

const newApiKey = generateUniqueHashedApiKey();
addApiKeyToSQLite(newApiKey, './apiKeys.db');
console.log(`New API key generated and stored: ${newApiKey}`);