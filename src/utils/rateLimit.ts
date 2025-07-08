import colors from "colors";
import { redis, isRedisEnabled } from './redis';

export const rateLimitMiddleware = async (req: Request, apiKey: string, customLimit: number): Promise<Response | undefined> => {
  if (!redis || !isRedisEnabled()) {
    console.log('Redis not available, skipping rate limiting');
    return;
  }

  try {
    console.log(`Checking rate limit for API key: ${apiKey}`);
    
    const currentTime = Math.floor(Date.now() / 1000);
    const windowStart = currentTime - (currentTime % 60);
    const key = `rateLimit:${apiKey}:${windowStart}`;
    console.log(`Using rate limit key: ${key}`);

    // Increment first with timeout
    const currentCount = await Promise.race([
      redis.incr(key),
      new Promise<number>((_, reject) => 
        setTimeout(() => reject(new Error('Redis timeout')), 3000)
      )
    ]);
    
    console.log(`Current request count: ${currentCount}`);

    // Set expiration if this is the first request in the window
    if (currentCount === 1) {
      await redis.expire(key, 60).catch(err => 
        console.warn(`Failed to set expiration for key ${key}:`, err)
      );
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
    // Don't block the request if Redis is having issues
    console.log('Allowing request due to Redis error');
  }
}