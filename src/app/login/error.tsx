"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const staleBuild =
    error.message.includes("ENOENT") && error.message.includes(".next");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F5EF] px-6">
      <div className="max-w-md text-center">
        <AlertCircle className="mx-auto mb-4 h-10 w-10 text-[#FF7A3D]" />
        <h1 className="text-xl font-semibold">Could not load sign in</h1>
        <p className="mt-3 text-sm leading-7 text-black/60">
          {staleBuild
            ? "The dev server cache is broken. In your project folder run: npm run fix — then reload this page."
            : error.message || "Something went wrong."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset} variant="outline">
            Try again
          </Button>
          <Button asChild className="bg-[#111111] text-white hover:bg-black/90">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
