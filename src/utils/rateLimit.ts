import Redis from 'ioredis';
import colors from "colors";
import { db } from "../db";
import { apiKeys } from "../db/schema";
import { getEnvVar } from './envUtils';
import { eq } from 'drizzle-orm';

const redisUrl = getEnvVar('REDIS_URL');
const useRedis = getEnvVar('USE_REDIS', 'true') === 'true';
const redis = useRedis ? new Redis(redisUrl) : undefined;

if (redis) {
  redis.on('connect', () => console.log(colors.green('Successfully Connected to DragonflyDB')));
  redis.on('error', (err) => console.error(colors.red('DragonflyDB Client Error'), err));
}

export const rateLimitMiddleware = async (req: Request, apiKey: string, customLimit: number): Promise<Response | undefined> => {
  if (!redis) {
    console.log('Redis/DragonflyDB not initialized, skipping rate limiting');
    return;
  }

  try {
    console.log(`Checking rate limit for API key: ${apiKey}`);
    
    const currentTime = Math.floor(Date.now() / 1000);
    const windowStart = currentTime - (currentTime % 60);
    const key = `rateLimit:${apiKey}:${windowStart}`;
    console.log(`Using rate limit key: ${key}`);

    // Increment first
    const currentCount = await redis.incr(key);
    console.log(`Current request count: ${currentCount}`);

    // Set expiration if this is the first request in the window
    if (currentCount === 1) {
      await redis.expire(key, 60);
      console.log(`Set expiration for key: ${key}`);
    }

    // Check limit after increment
    if (currentCount > customLimit) {
      console.log(`Rate limit exceeded for key: ${key}`);
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error(`Error in rate limit middleware: ${error}`);
  }
}