import { Database } from "bun:sqlite";
import colors from "colors";
const db = new Database('./apiKeys.db');


const validRoutes = ['/', '/another-route']; // Add all valid routes here
db.exec(`CREATE TABLE IF NOT EXISTS api_keys (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT)`);


const server = Bun.serve({
  port: process.env.PORT || 8080,
  fetch(req) {
    const url = new URL(req.url);

    // Check if the requested route is valid
    if (!validRoutes.includes(url.pathname)) {
      return new Response("Sorry seems like that route doesn't exist please check the docs to see how to use Aniflame API", { status: 404 });
    }

    if (url.pathname === "/") {
      return new Response("Hello Welcome to Aniflame API"); // Main route logic here; no API key required
    }

    // Validate the API key for other routes
    const apiKey = url.searchParams.get('apiKey');
    if (!apiKey) {
      return new Response('Please provide an API key', { status: 400 });
    }

    const stmt = db.prepare(`SELECT key FROM api_keys WHERE key = ?`);
    const validKey = stmt.get(apiKey);
    if (!validKey) {
      return new Response('Invalid API key', { status: 401 });
    }

    // Normal request processing
    return new Response("Hello Welcome to Aniflame API");
  },
});

console.log(colors.green(`Server started on port http://localhost:${server.port}`));
