import { Pool } from "pg";
import { getEnvVar } from "./envUtils";

async function clearApiKeyTable() {
  const pool = new Pool({
    connectionString: getEnvVar('POSTGRES_URL'),
  });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const deleteTableContent = `
      DELETE FROM api_keys`;
    await client.query(deleteTableContent);
    await client.query("COMMIT");
    console.log("API key table cleared successfully.");
  } catch (error) {
    console.error(`Error clearing API key table: ${error}`);
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
}

clearApiKeyTable();
