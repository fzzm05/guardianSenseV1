import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Missing Upstash Redis credentials. Please provide UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in the environment.",
    );
  }

  if (!url.startsWith("https://")) {
    throw new Error(
      `Upstash Redis client was passed an invalid URL. You should pass a URL starting with https. Received: "${url}".`,
    );
  }

  return { url, token };
}

export function getRedis() {
  if (!redis) {
    redis = new Redis(getRedisConfig());
  }

  return redis;
}
