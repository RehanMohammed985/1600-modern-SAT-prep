"use client";

import { CheckCircle2 } from "lucide-react";
import type { ScheduleBlock, StudyMode } from "@/lib/session-schedule";
import {
  activeBlock,
  formatClock,
  modeLabel,
  sessionProgressPercent,
  totalSessionSeconds,
} from "@/lib/session-schedule";
import type { SessionPhase } from "@/lib/types";
import { SessionTimerRing } from "@/components/session-timer-ring";
import { cn } from "@/lib/utils";

type Props = {
  schedule: ScheduleBlock[];
  phase: SessionPhase;
  inBreak: boolean;
  blockRemaining: number;
  blockTotal: number;
  studyMode: StudyMode;
  focusSkill: string;
  questionLabel: string;
  trackLabel?: string;
  foundationReadiness?: number;
};

export function SessionSchedulePanel({
  schedule,
  phase,
  inBreak,
  blockRemaining,
  blockTotal,
  studyMode,
  focusSkill,
  questionLabel,
  trackLabel,
  foundationReadiness,
}: Props) {
  const totalSec = totalSessionSeconds(schedule);
  const blockElapsed = Math.max(0, blockTotal - blockRemaining);
  const overallPct = sessionProgressPercent(schedule, phase, inBreak, blockElapsed);
  const blockPct = blockTotal > 0 ? blockElapsed / blockTotal : 0;
  const current = activeBlock(schedule, phase, inBreak);
  const idx = current ? schedule.findIndex((b) => b.id === current.id) : 0;
  const next = schedule[idx + 1];

  return (
    <div className="rounded-[1.5rem] border border-black/5 bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.04)] md:p-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-black/45">
            Tonight&apos;s session · {formatClock(totalSec)} total
          </p>
          <p className="mt-1 text-sm text-black/50">{modeLabel(studyMode)}</p>
          {trackLabel ? (
            <p className="mt-1 text-sm font-medium text-[#FF7A3D]/90">{trackLabel}</p>
          ) : null}
          {foundationReadiness != null && foundationReadiness < 72 ? (
            <p className="mt-1 text-xs text-black/45">
              Foundation progress: {foundationReadiness}% toward SAT-style questions
            </p>
          ) : null}
          <h2 className="mt-3 text-xl font-semibold tracking-tight">
            {current?.title ?? "Study block"}
          </h2>
          <p className="mt-2 text-sm leading-7 text-black/60">{current?.why}</p>
          {current?.kind === "focus" ? (
            <p className="mt-2 text-sm font-medium text-black/75">
              Skill tonight: <span className="text-[#111111]">{focusSkill}</span>
            </p>
          ) : null}
          <p className="mt-3 text-xs text-black/45">
            {questionLabel}
            {next ? (
              <>
                {" "}
                · Up next: <span className="font-medium text-black/70">{next.title}</span>
              </>
            ) : null}
          </p>
        </div>
        <SessionTimerRing
          progress={inBreak ? blockRemaining / blockTotal : blockPct}
          label={formatClock(blockRemaining)}
          sublabel={inBreak ? "break left" : "this block"}
          variant={inBreak ? "break" : "focus"}
        />
      </div>

      <div className="mt-6">
        <div className="mb-2 flex justify-between text-xs text-black/45">
          <span>Full session</span>
          <span>{overallPct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-black/8">
          <div
            className="h-full rounded-full bg-[#111111] transition-all duration-700 ease-out"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      <ol className="mt-6 grid list-none gap-1.5 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {schedule.map((b, i) => {
          const isCurrent = current?.id === b.id;
          const isDone = i < (current ? schedule.findIndex((x) => x.id === current.id) : 0);
          return (
            <li
              key={b.id}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs",
                isCurrent && "bg-[#111111] font-medium text-white",
                isDone && !isCurrent && "text-black/50",
                !isCurrent && !isDone && "text-black/35"
              )}
            >
              {isDone ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              ) : (
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    isCurrent ? "bg-white" : "bg-black/15"
                  )}
                />
              )}
              <span>
                {b.title} · {Math.round(b.durationSeconds / 60)}m
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
