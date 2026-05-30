"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[1600] global-error", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  const isStaleBuild =
    error.message.includes("ENOENT") && error.message.includes(".next");

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-[#FCFBF8] px-6 font-sans">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-black/90">Something went wrong</h1>
          <p className="mt-3 text-sm leading-7 text-black/60">
            {isStaleBuild
              ? "The dev server build cache is out of date. Stop the server, run npm run dev again (it clears .next automatically), then reload."
              : error.message || "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-full bg-[#111111] px-6 py-2.5 text-sm font-medium text-white"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
