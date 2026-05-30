"use client";

import { useEffect, useState } from "react";
import { SessionTimerRing } from "@/components/session-timer-ring";
import { Button } from "@/components/ui/button";
import { formatClock } from "@/lib/session-schedule";
import type { ScheduleBlock } from "@/lib/session-schedule";

type Props = {
  block: ScheduleBlock;
  durationSeconds: number;
  onContinue: () => void;
};

export function SessionBreakScreen({ block, durationSeconds, onContinue }: Props) {
  const [remaining, setRemaining] = useState(durationSeconds);

  useEffect(() => {
    setRemaining(durationSeconds);
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [durationSeconds]);

  useEffect(() => {
    if (remaining === 0) onContinue();
  }, [remaining, onContinue]);

  return (
    <div className="session-break-bg relative overflow-hidden rounded-[1.5rem] border border-[#6B9B7A]/20 bg-[#F0F7F2] p-8 text-center md:p-12">
      <div className="session-break-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative z-10">
        <p className="text-xs uppercase tracking-[0.24em] text-[#3d5c47]">Break time</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#1a2e22]">{block.title}</h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#3d5c47]/90">{block.why}</p>
        <div className="mt-10 flex justify-center">
          <SessionTimerRing
            progress={remaining / durationSeconds}
            label={formatClock(remaining)}
            sublabel="until timed practice"
            variant="break"
            size={140}
          />
        </div>
        <p className="mt-8 text-sm text-[#3d5c47]/80">Next: {block.after}</p>
        <Button
          type="button"
          onClick={onContinue}
          className="mt-8 rounded-full bg-[#111111] px-8 text-white hover:bg-black/90"
        >
          Start timed practice early
        </Button>
      </div>
    </div>
  );
}
