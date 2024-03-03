import { Database } from "bun:sqlite";
import colors from "colors";

const db = new Database("./apiKeys.db");
db.exec(
  `CREATE TABLE IF NOT EXISTS api_keys (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT)`
);

async function loadApiKeys() {
  try {
    const apiKeys = db.query("SELECT key FROM api_keys").all();
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
    return [];
  }
}

export const start = async () => {
  await loadApiKeys();

  const routes: {
    [key: string]: {
      path: string;
      handler: (req: Request) => Promise<Response>;
      rateLimit: number;
    };
  } = {};
  const routeFiles = [await import("./impl/info.ts")];

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
    fetch(req) {
      try {
        const url = new URL(req.url);

        if (url.pathname === "/") {
          return new Response(
            JSON.stringify({ message: "Welcome to Aniflame API!" }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        
        if (!Object.hasOwn(routes, url.pathname)) {
          return new Response(JSON.stringify({ error: "Route not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }


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

        const stmt = db.prepare(`SELECT key FROM api_keys WHERE key = ?`);
        const validKey = stmt.get(apiKey);
        if (!validKey) {
          return new Response(JSON.stringify({ error: "Invalid API key" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

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
  console.log(colors.blue(`Server started on port http://localhost:${server.port}`));
};
