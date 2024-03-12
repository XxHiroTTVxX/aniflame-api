import { Pool } from "pg";
import { getEnvVar } from "../utils/envUtils.ts";
import colors from "colors";
import Redis from 'ioredis';

// Connect to Redis using the URL from environment variables
const redisUrl = getEnvVar('REDIS_URL');
const redis = new Redis(redisUrl);

// Initialize the database
const pool = new Pool({
  connectionString: getEnvVar('POSTGRES_URL'),
});
pool.query("CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INT)");

// Rate limit settings
const WINDOW_SIZE = 60 * 1000; // Window size in milliseconds (e.g., 1 minute)

const rateLimitMiddleware = async (req: Request, apiKey: string, customLimit: number): Promise<Response | undefined> => {
  const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
  const windowStart = currentTime - WINDOW_SIZE;

  const key = `rateLimit:${apiKey}:${windowStart}`;

  // Increment the count for the API key in the current window
  const result = await pool.query("SELECT count FROM rate_limits WHERE key = $1", [key]);
  const currentCount = result.rows[0] ? result.rows[0].count : 0;

  if (currentCount === 0) {
    // If this is the first request in the current window, insert the key with count 1
    await pool.query("INSERT INTO rate_limits (key, count) VALUES ($1, 1)", [key]);
  } else {
    // Otherwise, increment the count
    await pool.query("UPDATE rate_limits SET count = count + 1 WHERE key = $1", [key]);
  }

  if (currentCount > customLimit) {
    // If the rate limit is exceeded, return a 429 response
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  // If the rate limit is not exceeded, proceed with the request
};

// Function to load API keys from the database
async function loadApiKeys() {
  try {
    const result = await pool.query("SELECT key FROM api_keys");
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
        const isValidApiKey = keys.some((key: any) => key.key === apiKey);
        if (!isValidApiKey) {
          return new Response(
            JSON.stringify({ error: "Not valid API key" }),
            {
              status: 403,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // Apply rate-limiting middleware before processing the request
        const route = routes[url.pathname];
        if (route && route.rateLimit) {
          const rateLimitResponse = await rateLimitMiddleware(req, apiKey, route.rateLimit);
          if (rateLimitResponse) return rateLimitResponse;
        }

        // Process the request
        const routeHandler = routes[url.pathname].handler;
        return routeHandler(req);
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