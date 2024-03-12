// Import the createResponse function
import { rateLimitMiddleware } from "../../lib/rateLimit"; // Import the middleware
import { createResponse } from "../../lib/response";

// Define an array of names
const names = [
  "Alice",
  "Bob",
  "Charlie",
  "Dave",
  "Eve",
  "Frank",
  "Grace",
  "Hannah",
  "Ivan",
  "Judy",
];

// Route handler
export const handler = async (req: Request): Promise<Response> => {
  // Extract the API key from query parameters for demonstration
  const apiKey = req.url.split('?apiKey=')[1];

  // Call the rateLimitMiddleware and await its response
  const rateLimitResponse = await rateLimitMiddleware(req, apiKey, route.rateLimit);
  if (rateLimitResponse) return rateLimitResponse; // If rate limited, return the response

  // Proceed with the original handler logic if not rate limited
  return createResponse(JSON.stringify({ names }));
};

// Define the route
// Define the route with a custom rate limit
const route = {
  path: "/info",
  handler,
  rateLimit: 90, // Custom rate limit for this route
};

export default route;