import { defineConfig } from 'drizzle-kit';


export default defineConfig({
  schema: './src/db/schema.ts', // Ensure this path is correct
  dialect: 'postgresql',
  out: './drizzle',
  dbCredentials: {
    url: Bun.env.POSTGRES_URL!,
  },
});