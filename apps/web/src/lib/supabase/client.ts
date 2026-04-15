import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env/public";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!client) {
    client = createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
  }
  return client;
}
