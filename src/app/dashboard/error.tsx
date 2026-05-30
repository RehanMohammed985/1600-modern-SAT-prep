"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { SUPABASE_NOT_CONFIGURED } from "@/lib/env";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message =
    error.message === SUPABASE_NOT_CONFIGURED
      ? "Database not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local."
      : error.message || "Something went wrong loading your dashboard.";

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <AlertCircle className="mb-4 h-10 w-10 text-[#FF7A3D]" />
      <h1 className="text-xl font-semibold text-black/90">Could not load dashboard</h1>
      <p className="mt-3 text-sm leading-7 text-black/60">{message}</p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset} variant="outline">
          Try again
        </Button>
        <Button asChild className="bg-[#111111] text-white hover:bg-black/90">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}
