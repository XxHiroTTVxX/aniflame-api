import { defineConfig } from "drizzle-kit";
import { getEnvVar } from "./src/utils/envUtils";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: `${getEnvVar('POSTGRES_URL')}`,
  }
});
