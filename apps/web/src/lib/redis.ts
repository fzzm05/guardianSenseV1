import { Redis } from '@upstash/redis'

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  throw new Error("Missing Upstash Redis credentials. Please provide UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in the environment.");
}

export const redis = new Redis({
  url,
  token,
});
