import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { hasSupabaseConfig, SUPABASE_NOT_CONFIGURED } from "@/lib/env";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export { SUPABASE_NOT_CONFIGURED };

export function isSupabaseNotConfiguredError(error: unknown): boolean {
  return error instanceof Error && error.message === SUPABASE_NOT_CONFIGURED;
}

export async function createClient() {
  if (!hasSupabaseConfig()) {
    throw new Error(SUPABASE_NOT_CONFIGURED);
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component — middleware handles refresh.
          }
        },
      },
    }
  );
}
