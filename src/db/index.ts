import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { getEnvVar } from "../utils/envUtils";

const client = new Client({
  connectionString: getEnvVar('POSTGRES_URL'),
});

await client.connect();
export const db = drizzle(client);