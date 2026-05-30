import { createBrowserClient, type SupabaseClient } from "@supabase/ssr";
import { hasSupabaseConfig } from "@/lib/env";

let warned = false;

export function createClient(): SupabaseClient {
  if (!hasSupabaseConfig()) {
    if (typeof window !== "undefined" && !warned) {
      warned = true;
      console.warn(
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local"
      );
    }
    return createBrowserClient("https://placeholder.supabase.co", "placeholder-anon-key");
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function isSupabaseClientReady(): boolean {
  return hasSupabaseConfig();
}
