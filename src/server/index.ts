import { Pool } from "pg";
import { getEnvVar } from "../utils/envUtils.ts";
import colors from "colors";
import Redis from 'ioredis';
import { rateLimitMiddleware } from "../lib/rateLimit.ts";

// Connect to Redis using the URL from environment variables
const redisUrl = getEnvVar('REDIS_URL');
const redis = new Redis(redisUrl);
export const cacheTime = getEnvVar('REDIS_CACHE_TIME') || 60 * 60 * 24 * 7 * 2;

// Initialize the database
const pool = new Pool({
  connectionString: getEnvVar('POSTGRES_URL'),
});
pool.query("CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INT)");

// Function to load API keys from the database
async function loadApiKeys() {
  try {
    const result = await pool.query("SELECT key, whitelisted FROM api_keys");
    const apiKeys = result.rows;
    console.log(
      colors.gray(
        `Loaded ${colors.yellow(apiKeys.length.toString())} API key(s)`
      )
    );
    return apiKeys;
  } catch (error) {
    console.error(
      colors.red(`Error loading API keys: ${(error as Error).message}`)
    );
    console.log(colors.red("Error: Please generate an API key before starting the server"));
    return [];
  }
}

// Function to start the server
export const startServer = async () => {
  // Load API keys
  const keys = await loadApiKeys();
  if (keys.length === 0) {
    console.log(colors.red("Error: No API keys found. Server cannot start."));
    return;
  }

  // Initialize routes
  const routes: {
    [key: string]: {
      path: string;
      handler: (req: Request) => Promise<Response>;
      rateLimit: number;
    };
  } = {};

  // Import route files
  const routeFiles = [await import("./routes/info.ts")];

  // Iterate over route files and add them to the routes
  for (const file of routeFiles) {
    const routeModule = await file;
    const route = routeModule.default;

    if (route) {
        const { path, handler, rateLimit } = route;
        routes[path] = { path, handler, rateLimit };
    }
}

  // Log the number of loaded routes
  console.log(
    colors.gray(
      `Loaded ${colors.yellow(Object.keys(routes).length + "")} route(s)`
    )
  );

  // Start the server
  const server = Bun.serve({
    development: true,
    port: process.env.PORT || 8080,
    fetch: async (req) => {
      try {
        const url = new URL(req.url);

        // Handle the root path
        if (url.pathname === "/") {
          return new Response(
            JSON.stringify({ message: "Welcome to Aniflame API!" }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // Handle the case where the API key is not provided
        const apiKey = url.searchParams.get("apiKey");
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: "API Key Not Provided" }),
            {
              status: 401,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        // Check if the API key is valid
        const apiKeyDetails = keys.find((key: any) => key.key === apiKey);
        if (!apiKeyDetails) {
          return new Response(
            JSON.stringify({ error: "Not valid API key" }),
            {
              status: 403,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        // Process the request if the key is whitelisted or rate limit is bypassed
        const pathName = `/${url.pathname.split("/").slice(1)[0]}`;

        // Process the request if the key is whitelisted or rate limit is bypassed
        if (routes[pathName]) {
          const { handler } = routes[pathName]
          return handler(req);
        } else {
          return new Response(
            JSON.stringify({ error: "Not Found" }),
            {
              status: 404,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      } catch (error) {
        console.error(
          colors.red(`Error handling request: ${(error as Error).message}`)
        );
        return new Response(
          JSON.stringify({ error: "Internal Server Error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },
  });

  // Log the server start
  console.log(
    colors.blue(`Server started on port http://localhost:${server.port}`)
  );
};