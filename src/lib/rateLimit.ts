import Redis from 'ioredis';
import colors from "colors";

import { getEnvVar } from '../utils/envUtils';

// Assuming REDIS_URL is set in your environment variables
const redisUrl = getEnvVar('REDIS_URL');
const redis = new Redis(redisUrl); // Connect to Redis using the URL from environment variables

redis.on('connect', () => console.log(colors.green('Succesfully Connected to Redis')));
redis.on('error', (err) => console.error(colors.red('Redis Client Error'), err));

export const rateLimitMiddleware = async (req: Request, apiKey: string, customLimit: number): Promise<Response | undefined> => {

    const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
    const windowStart = currentTime - (currentTime % 60);
    const WINDOW_SIZE = 60; // Assuming a window size of 60 seconds
    const key = `rateLimit:${apiKey}:${windowStart}`;



    // Increment the count for the API key in the current window

    const currentCount = await redis.incr(key);

    if (currentCount === 1) {

        // If this is the first request in the current window, set the key to expire after the window size

        await redis.expire(key, WINDOW_SIZE);

    }



    if (currentCount > customLimit) {

        // If the rate limit is exceeded, return a 429 response

        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {

            status: 429,

            headers: { "Content-Type": "application/json" },

        });

    }
}
