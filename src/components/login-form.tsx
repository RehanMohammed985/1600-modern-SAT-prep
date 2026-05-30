"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { signUpAccount } from "@/app/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient, isSupabaseClientReady } from "@/lib/supabase/client";

function isAlreadyRegisteredMessage(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes("already registered") ||
    m.includes("already exists") ||
    m.includes("user already")
  );
}

async function redirectIntoApp(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return "Could not establish your session. Try signing in again.";
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  const path = profile?.onboarding_completed ? "/dashboard" : "/onboarding";
  window.location.assign(path);
  return null;
}

async function signInAndEnterApp(email: string, password: string): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return error.message;
  return redirectIntoApp(supabase);
}

export function LoginForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!isSupabaseClientReady()) {
      setError(
        "Database not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart npm run dev."
      );
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const trimmedEmail = email.trim();

    if (mode === "signup") {
      const created = await signUpAccount(trimmedEmail, password);
      if ("error" in created) {
        setError(created.error);
        if (created.alreadyRegistered) setMode("signin");
        setLoading(false);
        return;
      }

      if (created.method === "client") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
        });

        if (signUpError) {
          if (isAlreadyRegisteredMessage(signUpError.message)) {
            setError("This email already has an account. Sign in with your password below.");
            setMode("signin");
          } else {
            setError(signUpError.message);
          }
          setLoading(false);
          return;
        }

        const identities = data.user?.identities ?? [];
        if (data.user && identities.length === 0) {
          setError("This email already has an account. Sign in with your password.");
          setMode("signin");
          setLoading(false);
          return;
        }

        if (data.session) {
          const enterError = await redirectIntoApp(supabase);
          if (enterError) setError(enterError);
          setLoading(false);
          return;
        }
      }

      const signInError = await signInAndEnterApp(trimmedEmail, password);
      if (signInError) {
        setError(
          "Account created, but sign-in failed. In Supabase → Authentication → Providers → Email, turn off \"Confirm email\", then try signing in."
        );
        setMode("signin");
        setLoading(false);
        return;
      }
      return;
    }

    const signInError = await signInAndEnterApp(trimmedEmail, password);
    if (signInError) {
      if (signInError.toLowerCase().includes("invalid login")) {
        setError("Wrong email or password.");
      } else {
        setError(signInError);
      }
      setLoading(false);
      return;
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F5EF] px-4">
      <Card className="w-full max-w-md border-black/10 shadow-lg">
        <CardHeader className="space-y-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#111111] text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            1600
          </Link>
          <div>
            <CardTitle className="text-2xl">
              {mode === "signup" ? "Create your account" : "Sign in"}
            </CardTitle>
            <CardDescription>
              {mode === "signup"
                ? "No email confirmation — you'll go straight into setup."
                : "Continue where you left off."}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
                className="h-11 rounded-xl border-black/10 bg-[#FCFBF8]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="h-11 rounded-xl border-black/10 bg-[#FCFBF8]"
              />
            </div>
            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-full bg-[#111111] hover:bg-black/90"
            >
              {loading
                ? "Please wait…"
                : mode === "signup"
                  ? "Create account"
                  : "Sign in"}
            </Button>
          </form>

          <button
            type="button"
            className="w-full text-center text-sm text-black/55 hover:text-black"
            onClick={() => {
              setMode(mode === "signup" ? "signin" : "signup");
              setError(null);
            }}
          >
            {mode === "signup"
              ? "Already have an account? Sign in"
              : "New here? Create an account"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
