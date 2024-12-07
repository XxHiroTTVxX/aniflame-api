import type { Redis } from "ioredis";

const fetch = async <T>(redis: Redis | undefined, key: string, fetcher: () => T, expires: number) => {
  if (!redis) return fetcher();
  const existing = await get<T>(redis, key);
  if (existing !== null) return existing;

  return set(redis, key, fetcher, expires);
};

const get = async <T>(redis: Redis | undefined, key: string): Promise<T | null> => {
  if (!redis) return null;
  const value = await redis.get(key);
  if (value === null) return null;

  return JSON.parse(value);
};

const set = async <T>(redis: Redis | undefined, key: string, data: T, expires: number) => {
  if (!redis) return data;
  await redis.set(key, JSON.stringify(data), "EX", expires);
  return data;
};

const del = async (redis: Redis | undefined, key: string) => {
  if (!redis) return;
  await redis.del(key);
};

export default { fetch, set, get, del };