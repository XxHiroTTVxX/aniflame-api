// Import the createResponse function
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
  // Return the names array as part of the response
  return createResponse(JSON.stringify({ names }));
};

// Define the route
const route = {
  path: "/test",
  handler,
  rateLimit: 60,
};

export default route;