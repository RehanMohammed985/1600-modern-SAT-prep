import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function postAuthPath(origin: string): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "/login";

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.onboarding_completed ? "/dashboard" : "/onboarding";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const destination =
        next && next.startsWith("/") && !next.startsWith("//")
          ? next === "/"
            ? await postAuthPath(origin)
            : next
          : await postAuthPath(origin);
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
