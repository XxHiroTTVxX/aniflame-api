import { Redis } from '@upstash/redis';
import colors from "colors";
import { getEnvVar } from './envUtils';

// Create a single Redis instance for the entire application
let redisInstance: Redis | null = null;
let redisEnabled = false;

export function getRedisInstance(): Redis | null {
  if (redisInstance) {
    return redisInstance;
  }

  const redisUrl = getEnvVar('REDIS_URL');
  const useRedis = getEnvVar('USE_REDIS', 'true') === 'true';

  if (!useRedis || !redisUrl) {
    console.log(colors.yellow('Redis not configured, caching disabled'));
    return null;
  }

  try {
    // Parse the Redis URL to extract Upstash details
    const url = new URL(redisUrl);
    const token = url.password;
    const host = url.hostname;
    
    // Create Upstash Redis instance
    redisInstance = new Redis({
      url: `https://${host}`,
      token: token,
    });

    console.log(colors.green('Successfully Connected to Upstash Redis'));
    redisEnabled = true;
    return redisInstance;
  } catch (error) {
    console.error(colors.red('Failed to create Upstash Redis connection:'), error);
    return null;
  }
}

// Check if Redis is actually working
export function isRedisEnabled(): boolean {
  return redisEnabled && redisInstance !== null;
}

// Graceful shutdown function
export async function closeRedisConnection(): Promise<void> {
  if (redisInstance) {
    try {
      // Upstash Redis doesn't need explicit closing, but we can clean up
      redisInstance = null;
      redisEnabled = false;
      console.log(colors.yellow('Upstash Redis connection closed gracefully'));
    } catch (error) {
      console.error(colors.red('Error closing Upstash Redis connection:'), error);
      redisInstance = null;
      redisEnabled = false;
    }
  }
}

// Export the Redis instance for direct use
export const redis = getRedisInstance(); 