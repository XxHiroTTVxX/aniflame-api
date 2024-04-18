import Redis from 'ioredis';
import colors from "colors";
import { Pool } from 'pg';


import { getEnvVar } from '../utils/envUtils';

// Assuming REDIS_URL is set in your environment variables
const redisUrl = getEnvVar('REDIS_URL');
const redis = new Redis(redisUrl); // Connect to Redis using the URL from environment variables
const pool = new Pool({
    connectionString: getEnvVar('POSTGRES_URL'),
  });

redis.on('connect', () => console.log(colors.green('Succesfully Connected to Redis')));
redis.on('error', (err) => console.error(colors.red('Redis Client Error'), err));

export const rateLimitMiddleware = async (req: Request, apiKey: string, customLimit: number): Promise<Response | undefined> => {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT whitelisted FROM api_keys WHERE key = $1', [apiKey]);
      const isWhitelisted = result.rows[0]?.whitelisted;
  
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
    } finally {
      client.release();
    }
  }