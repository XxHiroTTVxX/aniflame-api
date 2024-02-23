import { Database } from "bun:sqlite";

function isValidApiKey(apiKey: string, dbPath: string): boolean {
    const db = new Database(dbPath);
    try {
        const result = db.query(`SELECT key FROM api_keys WHERE key = '${apiKey}'`).all();
        return result.length > 0;
    } finally {
        db.close();
    }
}

const apiKeyToValidate = process.argv[2]; // Get the API key from command-line arguments
const dbPath = './apiKeys.db'; // The path to your SQLite database

if (apiKeyToValidate) {
  const isValid = isValidApiKey(apiKeyToValidate, dbPath);
  console.log(`API Key is ${isValid ? "valid" : "invalid"}.`);
} else {
  console.error("Please provide an API key to validate.");
}