import type { StudyMode } from "./session-schedule";

export type PhaseCounts = {
  warmup: number;
  focus: number;
  mixed: number;
  timed: number;
  mistakes: number;
};

const PLAN_BY_MINUTES: Record<number, PhaseCounts> = {
  20: { warmup: 2, focus: 4, mixed: 2, timed: 3, mistakes: 2 },
  30: { warmup: 3, focus: 6, mixed: 4, timed: 4, mistakes: 3 },
  45: { warmup: 4, focus: 8, mixed: 5, timed: 5, mistakes: 4 },
  60: { warmup: 5, focus: 10, mixed: 6, timed: 6, mistakes: 4 },
  90: { warmup: 6, focus: 14, mixed: 8, timed: 8, mistakes: 5 },
};

const SLOW_FACTOR = 0.7;

export function normalizeStudyMinutes(raw: number | null | undefined): number {
  const options = [20, 30, 45, 60, 90];
  if (raw == null || !Number.isFinite(raw)) return 30;
  let closest = 30;
  let minDiff = Infinity;
  for (const m of options) {
    const diff = Math.abs(m - raw);
    if (diff < minDiff) {
      minDiff = diff;
      closest = m;
    }
  }
  return closest;
}

export function phaseCountsForSession(
  studyMinutes: number | null | undefined,
  options?: { slowMode?: boolean; timingIssues?: boolean }
): PhaseCounts {
  const minutes = normalizeStudyMinutes(studyMinutes);
  const base = PLAN_BY_MINUTES[minutes] ?? PLAN_BY_MINUTES[30];
  const factor = options?.slowMode ? SLOW_FACTOR : 1;

  const scale = (n: number) => Math.max(1, Math.round(n * factor));

  const counts: PhaseCounts = {
    warmup: scale(base.warmup),
    focus: scale(base.focus),
    mixed: scale(base.mixed),
    timed: scale(options?.timingIssues ? Math.max(2, base.timed - 1) : base.timed),
    mistakes: scale(base.mistakes),
  };

  return counts;
}

export function totalQuestionsInPlan(counts: PhaseCounts): number {
  return counts.warmup + counts.focus + counts.mixed + counts.timed + counts.mistakes;
}

/** Scale schedule block durations to match student's daily study goal */
export function scheduleDurationScale(studyMinutes: number | null | undefined): number {
  return normalizeStudyMinutes(studyMinutes) / 30;
}

export function sessionDurationLabel(studyMinutes: number | null | undefined): string {
  const m = normalizeStudyMinutes(studyMinutes);
  return `about ${m} min`;
}

export function scaledBlockMinutes(
  baseMinutes: number,
  studyMinutes: number | null | undefined,
  mode: StudyMode
): number {
  const scale = scheduleDurationScale(studyMinutes);
  const modeFactor = mode === "beginner" ? 1.15 : mode === "test" ? 0.9 : 1;
  return Math.max(2, Math.round(baseMinutes * scale * modeFactor));
}
