"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { startSession } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function StartSessionButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      const result = await startSession();
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.sessionId) {
        router.push(`/session?id=${result.sessionId}`);
      }
    } catch {
      setError("Could not start session. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shrink-0 space-y-2">
      <Button
        type="button"
        disabled={loading}
        onClick={() => void handleStart()}
        className="h-12 w-full rounded-full bg-[#111111] px-8 text-base font-semibold text-white shadow-[0_18px_60px_rgba(0,0,0,0.15)] hover:bg-black/90 md:w-auto"
      >
        <Play className="mr-2 h-4 w-4" />
        {loading ? "Starting…" : "Start session"}
      </Button>
      {error ? (
        <p className="max-w-xs text-center text-sm text-red-700 md:text-left">{error}</p>
      ) : null}
    </div>
  );
}
