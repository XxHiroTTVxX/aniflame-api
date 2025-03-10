import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { getEnvVar } from "../utils/envUtils";

const sql = neon(getEnvVar('POSTGRES_URL'));
const db = drizzle(sql);

export { db };