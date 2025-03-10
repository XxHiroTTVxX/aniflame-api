import colors from "colors";
import { rateLimitMiddleware } from "../utils/rateLimit.ts";
import { db  } from "../db";
import { apiKeys } from "../db/schema";
import { trackApiKeyUsage } from "../lib/middleware";



async function loadApiKeys() {
  try {
    const result = await db
      .select({
        key: apiKeys.key,
        whitelisted: apiKeys.whitelisted
      })
      .from(apiKeys);
    const apiKeysData = result;
    console.log(
      colors.gray(
        `Loaded ${colors.yellow(apiKeysData.length.toString())} API key(s)`
      )
    );
    return apiKeysData;
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

  const routeFiles = [
    await import("./routes/info.ts"),
    await import("./routes/generateKey.ts")
  ];

  for (const file of routeFiles) {
    const routeModule = await file;
    const route = routeModule.default;

    if (route) {
        const { path, handler, rateLimit } = route;
        routes[path] = { path, handler, rateLimit };
    }
}

  console.log(
    colors.gray(
      `Loaded ${colors.yellow(Object.keys(routes).length + "")} route(s)`
    )
  );

  const server = Bun.serve({
    development: true,
    port: process.env.PORT || 8080,
    fetch: async (req) => {
      try {
        const url = new URL(req.url);

        if (url.pathname === "/") {
          return new Response(
            JSON.stringify({ 
              message: "Welcome to Anidex!",
              description: "Anidex is a powerful anime indexing and streaming platform",
              features: [
                "Comprehensive anime database",
                "Real-time streaming capabilities",
                "Advanced search and filtering",
                "API access for developers",
                "Customizable watchlists"
              ],
              version: "1.0.0",
              documentation: "",
              support: "support@anidex.com"
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // Add middleware call
        const apiKey = req.headers.get('x-api-key') || new URL(req.url).searchParams.get('apiKey') || '';
        if (apiKey) {
          await trackApiKeyUsage(apiKey, req);
        }

        // Find API Key Details
        const apiKeyDetails = keys.find((key: any) => key.key === apiKey);
        if (!apiKeyDetails) {
          return new Response(JSON.stringify({ error: "Not valid API key" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Track API key usage with endpoint info
        const pathName = `/${url.pathname.split("/").slice(1)[0]}`;
        await trackApiKeyUsage(
          apiKey, 
          req,  // Ensure the request object is passed
          undefined  // Optional status parameter
        );

        // Route Handling with Rate Limiting
        if (routes[pathName]) {
          const { handler, rateLimit } = routes[pathName];
          console.log(`Processing request for path: ${pathName}, API key: ${apiKey}`);
          if (apiKeyDetails.whitelisted) {
            console.log(`Whitelisted key detected: ${apiKey}`);
            const result = await handler(req);
            return result;
          } else {
            console.log(`Applying rate limit for key: ${apiKey}, limit: ${rateLimit}`);
            const response = await rateLimitMiddleware(req, apiKey, rateLimit);
            console.log(`Rate limit middleware response: ${response ? 'Rate limited' : 'Allowed'}`);
            if (response) {
              return response;
            } else {
              const result = await handler(req);
              return result;
            }
          }
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

  console.log(
    colors.blue(`Server started on port http://localhost:${server.port}`)
  );
};