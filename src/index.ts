import { Database } from "bun:sqlite";
import colors from "colors";
const db = new Database('./apiKeys.db');


const validRoutes = ['/', './another-route']; // Add all valid routes here
db.exec(`CREATE TABLE IF NOT EXISTS api_keys (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT)`);

async function fetchData(route: string): Promise<{ message: string } | { data: any }> {
  try {
    const response = await fetch(route);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const responseData = await response.json();
    console.log("Data fetched:", responseData);
    if (responseData) {
      return { data: responseData };
    } else {
      return { message: 'No data found' };
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    return { message: 'No data found' };
  }
}

const server = Bun.serve({
  port: process.env.PORT || 8080,
  async fetch(req) {
    const url = new URL(req.url);
    // Handle invalid routes first
    if (!validRoutes.includes(url.pathname)) {
      return new Response(JSON.stringify({ error: "Route not found" }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle the root path
    if (url.pathname === "/") {
      return new Response(JSON.stringify({ message: "Welcome to Aniflame API!" }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check for API key in the query parameters
    const apiKey = url.searchParams.get('apiKey');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate the API key against the database
    const stmt = db.prepare(`SELECT key FROM api_keys WHERE key = ?`);
    const validKey = stmt.get(apiKey);
    if (!validKey) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch and await the data before returning the response
    const data = await fetchData(url.pathname); // Await the promise from fetchData
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

console.log(colors.blue(`Server started on port http://localhost:${server.port}`));
