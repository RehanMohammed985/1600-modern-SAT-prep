import type { Profile, SessionPhase } from "./types";
import { SKILL_LABELS } from "./types";
import { formatSkillTag } from "./utils";
import { scaledBlockMinutes } from "./session-length";

export type StudyMode = "beginner" | "standard" | "test";

export type ScheduleBlockKind = "warmup" | "focus" | "mixed" | "break" | "timed" | "mistakes" | "summary";

export type ScheduleBlock = {
  id: string;
  kind: ScheduleBlockKind;
  title: string;
  durationSeconds: number;
  /** Server phase this block maps to; null for break */
  phase: SessionPhase | null;
  why: string;
  after: string;
};

const BLOCKS_BASE: Omit<ScheduleBlock, "durationSeconds">[] = [
  {
    id: "warmup",
    kind: "warmup",
    title: "Warmup",
    phase: "warmup",
    why: "Easy questions to settle in — no pressure.",
    after: "Main focus practice on your weakest skill.",
  },
  {
    id: "focus",
    kind: "focus",
    title: "Focus practice",
    phase: "focus",
    why: "We picked this skill from your recent misses.",
    after: "Mixed practice across skills you have been working on.",
  },
  {
    id: "mixed",
    kind: "mixed",
    title: "Mixed practice",
    phase: "mixed",
    why: "Switch between skills like a real study block — builds flexibility.",
    after: "A short break, then timed practice.",
  },
  {
    id: "break",
    kind: "break",
    title: "Break",
    phase: null,
    why: "Step away from the screen — water, stretch, breathe.",
    after: "Timed practice like test day.",
  },
  {
    id: "timed",
    kind: "timed",
    title: "Timed practice",
    phase: "timed",
    why: "Work at test pace on mixed questions.",
    after: "Review questions you missed.",
  },
  {
    id: "mistakes",
    kind: "mistakes",
    title: "Mistake review",
    phase: "mistakes",
    why: "Learn from misses while they are still fresh.",
    after: "A quick summary of what to remember.",
  },
  {
    id: "summary",
    kind: "summary",
    title: "Summary",
    phase: "takeaway",
    why: "Lock in one or two takeaways for tomorrow.",
    after: "Back to your dashboard — you're done for tonight.",
  },
];

const DURATION_MIN: Record<StudyMode, Record<ScheduleBlockKind, number>> = {
  beginner: { warmup: 6, focus: 22, mixed: 14, break: 6, timed: 15, mistakes: 12, summary: 4 },
  standard: { warmup: 5, focus: 20, mixed: 12, break: 5, timed: 20, mistakes: 10, summary: 3 },
  test: { warmup: 4, focus: 18, mixed: 10, break: 4, timed: 22, mistakes: 8, summary: 2 },
};

export function studyModeFromProfile(profile: Pick<Profile, "slow_mode" | "beginner_path" | "comfort_level">): StudyMode {
  if (profile.slow_mode || profile.beginner_path || profile.comfort_level === "lost" || profile.comfort_level === "unsure") {
    return "beginner";
  }
  if (profile.comfort_level === "improving") return "test";
  return "standard";
}

export function getSessionSchedule(
  mode: StudyMode,
  studyMinutes?: number | null
): ScheduleBlock[] {
  const mins = DURATION_MIN[mode];
  return BLOCKS_BASE.map((b) => ({
    ...b,
    durationSeconds: scaledBlockMinutes(mins[b.kind], studyMinutes, mode) * 60,
  }));
}

export function totalSessionSeconds(schedule: ScheduleBlock[]): number {
  return schedule.reduce((s, b) => s + b.durationSeconds, 0);
}

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Map server phase (+ optional break) to active schedule block */
export function activeBlock(
  schedule: ScheduleBlock[],
  phase: SessionPhase,
  inBreak: boolean
): ScheduleBlock | undefined {
  if (inBreak) return schedule.find((b) => b.kind === "break");
  if (phase === "takeaway") return schedule.find((b) => b.kind === "summary");
  return schedule.find((b) => b.phase === phase);
}

export function nextBlock(
  schedule: ScheduleBlock[],
  phase: SessionPhase,
  inBreak: boolean
): ScheduleBlock | undefined {
  const current = activeBlock(schedule, phase, inBreak);
  if (!current) return schedule[0];
  const idx = schedule.findIndex((b) => b.id === current.id);
  return schedule[idx + 1];
}

export function blockIndex(schedule: ScheduleBlock[], phase: SessionPhase, inBreak: boolean): number {
  const current = activeBlock(schedule, phase, inBreak);
  if (!current) return 0;
  return schedule.findIndex((b) => b.id === current.id);
}

export function sessionProgressPercent(
  schedule: ScheduleBlock[],
  phase: SessionPhase,
  inBreak: boolean,
  blockElapsed: number
): number {
  const total = totalSessionSeconds(schedule);
  let done = 0;
  const idx = blockIndex(schedule, phase, inBreak);
  for (let i = 0; i < idx; i++) done += schedule[i].durationSeconds;
  const current = schedule[idx];
  if (current) done += Math.min(blockElapsed, current.durationSeconds);
  return Math.min(100, Math.round((done / total) * 100));
}

export function focusSkillLabel(skillTag: string | null): string {
  if (!skillTag) return "core skills";
  return SKILL_LABELS[skillTag] ?? formatSkillTag(skillTag);
}

export function modeLabel(mode: StudyMode): string {
  if (mode === "beginner") return "Beginner mode — slower, more help";
  if (mode === "test") return "Test mode — stricter timing";
  return "Standard mode";
}

/** After mixed ends, show break before advancing server phase to timed */
export function shouldShowBreakAfterPhase(phase: SessionPhase): boolean {
  return phase === "mixed";
}
