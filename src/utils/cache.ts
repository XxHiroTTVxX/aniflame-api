import { redis, isRedisEnabled } from './redis';

const fetch = async <T>(key: string, fetcher: () => T, expires: number) => {
  if (!redis || !isRedisEnabled()) return fetcher();
  const existing = await get<T>(key);
  if (existing !== null) return existing;

  return set(key, fetcher, expires);
};

const get = async <T>(key: string): Promise<T | null> => {
  if (!redis || !isRedisEnabled()) return null;
  try {
    const value = await redis.get(key);
    if (value === null) return null;
    return value as T;
  } catch (error) {
    console.warn('Redis get failed:', error);
    return null;
  }
};

const set = async <T>(key: string, data: T, expires: number) => {
  if (!redis || !isRedisEnabled()) return data;
  try {
    await redis.set(key, data, { ex: expires });
  } catch (error) {
    console.warn('Redis set failed:', error);
  }
  return data;
};

const del = async (key: string) => {
  if (!redis || !isRedisEnabled()) return;
  try {
    await redis.del(key);
  } catch (error) {
    console.warn('Redis del failed:', error);
  }
};

export { fetch, get, set, del };