const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error("Missing required environment variable: EXPO_PUBLIC_API_BASE_URL");
}

console.log("[config] EXPO_PUBLIC_API_BASE_URL:", apiBaseUrl);

export const config = {
  apiBaseUrl
} as const;
