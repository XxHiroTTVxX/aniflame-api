// Import the createResponse function
import { rateLimitMiddleware } from "../../lib/rateLimit"; // Import the middleware
import { createResponse } from "../../lib/response";
import AniList from "../../scrapers/anilist";

// Create an instance of the AniList class
const aniList = new AniList();

export const handler = async (req: Request): Promise<Response> => {
  // Extract the AniList ID from the URL
  const parts = req.url.split('/');
  const aniListId = parts.length > 0 ? parts.pop() : undefined; // Get the last part of the URL

  if (!aniListId) {
    return createResponse(JSON.stringify({ error: "AniList ID not provided" }), 400);
  }

  // Call the rateLimitMiddleware and await its response
  const rateLimitResponse = await rateLimitMiddleware(req, aniListId, route.rateLimit);
  if (rateLimitResponse) return rateLimitResponse; // If rate limited, return the response

  // Proceed with fetching data from AniList
  const animeInfo = await aniList.getInfo("anime", parseInt(aniListId)); // Assuming the ID is for anime
  if (!animeInfo) {
    return createResponse(JSON.stringify({ error: "Failed to fetch anime information" }), 500);
  }

  return createResponse(JSON.stringify({ animeInfo }));
};


// Define the route
const route = {
  path: "/info/:aniListId", // Updated route path to accept AniList ID as a parameter
  handler,
  rateLimit: 90, // Custom rate limit for this route
};

export default route;
