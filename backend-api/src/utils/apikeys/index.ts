// Import necessary modules for cryptographic operations, console coloring, and SQLite database interaction.
import { CryptoHasher } from "bun";
import colors from "colors";
import { Database } from "bun:sqlite";
import { randomBytes } from "crypto";

/**
 * Generates a unique hashed API key.
 * This function combines a timestamp with a random nonce, hashes them together using SHA-256,
 * and then returns a string that includes the timestamp and a portion of the hash.
 * @returns {string} The generated API key.
 */
function generateUniqueHashedApiKey(): string {
  const timestamp = Date.now();
  // Generate a random nonce using  16 bytes and convert it to a hexadecimal string.
  const nonce = randomBytes(16).toString('hex').slice(0,   16);
  // Combine the timestamp and nonce to create a unique part.
  const uniquePart = `${timestamp}-${nonce}`;
  // Initialize a new CryptoHasher with SHA-256 algorithm.
  const hasher = new CryptoHasher('sha256');
  hasher.update(uniquePart);
  // Generate the hash and take the first  28 characters of it.
  const hash = hasher.digest('hex');
  const key = `${timestamp}${hash.substring(0,   28)}`;
  return key;
}

/**
 * Adds an API key to a SQLite database.
 * This function creates a new entry in the `api_keys` table with the provided API key and name.
 * It uses transactions to ensure data integrity.
 * @param {string} apiKey - The API key to be added.
 * @param {string} dbPath - The path to the SQLite database file.
 * @param {string} name - The name associated with the API key.
 */
async function addApiKeyToSQLite(apiKey: string, dbPath: string, name: string) {
  const db = new Database(dbPath);
  try {
    // Begin a transaction to ensure atomicity.
    db.exec("BEGIN TRANSACTION;");
    // Create the `api_keys` table if it doesn't exist.
    db.exec("CREATE TABLE IF NOT EXISTS api_keys (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT, name TEXT)");
    // Prepare an SQL statement to insert the API key and name into the table.
    const insert = db.prepare("INSERT INTO api_keys (key, name) VALUES (?, ?)");
    insert.run(apiKey, name);
    // Commit the transaction.
    db.exec("COMMIT;");
  } catch (error) {
    // Log any errors and rollback the transaction.
    console.error(`Error adding API key to SQLite: ${error}`);
    db.exec("ROLLBACK;");
  } finally {
    // Close the database connection.
    db.close();
  }
}

// Generate a new API key and store it in the SQLite database.
// The name of the API key is taken from the command line arguments or defaults to 'unknown'.
const newApiKey = generateUniqueHashedApiKey();
const apiKeyName = process.argv[2] || 'unknown';  
await addApiKeyToSQLite(newApiKey, './apiKeys.db', apiKeyName);
// Log the generated API key and its name to the console.
console.log(colors.green(`New API key generated and stored: ${newApiKey} (Name: ${apiKeyName})`));