"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  takeaways: string[];
};

export function SessionCompleteScreen({ takeaways }: Props) {
  return (
    <div className="session-complete-bg rounded-[1.5rem] border border-emerald-200/60 bg-gradient-to-b from-emerald-50/80 to-white p-8 text-center md:p-12">
      <div className="session-complete-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
        <CheckCircle2 className="h-9 w-9 text-emerald-600" />
      </div>
      <h2 className="mt-6 text-3xl font-semibold tracking-tight">Session complete</h2>
      <p className="mt-2 text-black/55">You finished tonight&apos;s plan. Nice work.</p>
      {takeaways.length > 0 ? (
        <ul className="mx-auto mt-8 max-w-md space-y-2 text-left text-sm leading-7 text-black/70">
          {takeaways.map((t) => (
            <li key={t} className="rounded-xl bg-white/80 px-4 py-3">
              {t}
            </li>
          ))}
        </ul>
      ) : null}
      <Button asChild className="mt-10 rounded-full bg-[#111111] px-8 py-6 text-base text-white hover:bg-black/90">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
