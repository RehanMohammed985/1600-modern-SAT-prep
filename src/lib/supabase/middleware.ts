import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ONBOARDED_COOKIE } from "@/lib/auth-cookies";
import { hasSupabaseConfig } from "@/lib/env";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

async function resolveOnboarded(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  request: NextRequest,
  response: NextResponse
): Promise<boolean> {
  // Only trust a positive cache — "0" can be stale after the user finishes onboarding.
  if (request.cookies.get(ONBOARDED_COOKIE)?.value === "1") {
    return true;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    // Avoid dashboard ↔ onboarding redirect loops when the DB check fails.
    return request.cookies.get(ONBOARDED_COOKIE)?.value === "1";
  }

  const onboarded = profile?.onboarding_completed === true;
  if (onboarded) {
    response.cookies.set(ONBOARDED_COOKIE, "1", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  } else {
    response.cookies.delete(ONBOARDED_COOKIE);
  }
  return onboarded;
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAuthRoute = path === "/login";
  const isPublicRoute = path === "/" || path.startsWith("/auth");

  if (!hasSupabaseConfig()) {
    if (!isPublicRoute && !isAuthRoute) {
      return redirectTo(request, "/login");
    }
    return NextResponse.next({ request });
  }

  try {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: CookieToSet[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      if (!isPublicRoute && !isAuthRoute) {
        return redirectTo(request, "/login");
      }
      return supabaseResponse;
    }

    const needsOnboardingCheck =
      path === "/" ||
      path === "/login" ||
      path === "/onboarding" ||
      path === "/dashboard" ||
      (!isPublicRoute && !isAuthRoute);

    const onboarded = needsOnboardingCheck
      ? await resolveOnboarded(supabase, user.id, request, supabaseResponse)
      : request.cookies.get(ONBOARDED_COOKIE)?.value === "1";

    if (path === "/") {
      return redirectTo(request, onboarded ? "/dashboard" : "/onboarding");
    }

    if (!onboarded && path !== "/onboarding" && !isPublicRoute && !isAuthRoute) {
      return redirectTo(request, "/onboarding");
    }

    if (path === "/login") {
      return redirectTo(request, onboarded ? "/dashboard" : "/onboarding");
    }

    if (onboarded && path === "/onboarding") {
      return redirectTo(request, "/dashboard");
    }

    return supabaseResponse;
  } catch {
    if (isPublicRoute || isAuthRoute) {
      return NextResponse.next({ request });
    }
    return redirectTo(request, "/login");
  }
}
