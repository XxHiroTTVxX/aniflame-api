import { Database } from "bun:sqlite";
import colors from "colors";
const db = new Database('./apiKeys.db');
db.exec(`CREATE TABLE IF NOT EXISTS api_keys (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT)`);


const server = Bun.serve({
  port: process.env.PORT || 8080,
  fetch(req) {
    const url = new URL(req.url);    

    if (url.pathname === "/") {
      // Main route logic here; no API key required
      return new Response("Hello Welcome to Aniflame API");
    }
    // Validate the API key
    // For other routes, validate the API key
    const apiKey = url.searchParams.get('apiKey');
    const validKey = db.prepare(`SELECT key FROM api_keys WHERE key = ?`).get(apiKey);
    if (!validKey) {
      return new Response('Invalid API key', { status: 401 });
    }
    // Normal request processing
    return new Response("Hello Welcome to Aniflame API");
  },
});

console.log(`Server is now listening on http://localhost:${server.port}`);