import Redis from 'ioredis';
import colors from "colors";
import { db  } from "../db";
import { apiKeys } from "../db/schema";
import { getEnvVar } from './envUtils';
import { eq } from 'drizzle-orm';

const redisUrl = getEnvVar('REDIS_URL');
const redis = new Redis(redisUrl);

redis.on('connect', () => console.log(colors.green('Succesfully Connected to Redis')));
redis.on('error', (err) => console.error(colors.red('Redis Client Error'), err));

export const rateLimitMiddleware = async (req: Request, apiKey: string, customLimit: number): Promise<Response | undefined> => {
    try {
      const result = await db.select({ whitelisted: apiKeys.whitelisted }).from(apiKeys).where(eq(apiKeys.key, apiKey)).limit(1);
      const isWhitelisted = result[0]?.whitelisted;
  
      if (isWhitelisted) {
        console.log('Whitelisted API key detected, bypassing rate limit.');
        return; // Bypass rate limiting for whitelisted keys
      }
  
      const currentTime = Math.floor(Date.now() / 1000);
      const windowStart = currentTime - (currentTime % 60);
      const WINDOW_SIZE = 60;
      const key = `rateLimit:${apiKey}:${windowStart}`;
  
      const currentCount = await redis.incr(key);

      if (currentCount === 1) {
        await redis.expire(key, WINDOW_SIZE);
      }
  
      if (currentCount > customLimit) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
            status: 429,
            headers: { "Content-Type": "application/json" },
        });
    }
    } catch (error) {
      console.error(`Error checking whitelisted status: ${error}`);
    }
  }