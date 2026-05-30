import { createClient } from "@supabase/supabase-js";

/** Service-role client — server only. Used to create pre-confirmed accounts. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key || url.includes("your-project")) return null;

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function hasAdminConfig(): boolean {
  return createAdminClient() != null;
}
