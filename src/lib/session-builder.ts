import { pickFocusSkill } from "./recommendations";
import type { Attempt, PhasePlan, Question, SessionPhase, SkillStats } from "./types";

type PhaseCounts = Record<Exclude<SessionPhase, "complete" | "takeaway" | "mistakes">, number>;

const DEFAULT_COUNTS: PhaseCounts = {
  warmup: 2,
  focus: 3,
  timed: 2,
  mixed: 2,
};

const SLOW_COUNTS: PhaseCounts = {
  warmup: 1,
  focus: 2,
  timed: 1,
  mixed: 1,
};

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickUnique(pool: Question[], count: number, used: Set<string>): Question[] {
  const picked: Question[] = [];
  for (const q of shuffle(pool)) {
    if (used.has(q.id)) continue;
    picked.push(q);
    used.add(q.id);
    if (picked.length >= count) break;
  }
  return picked;
}

export function normalizePhasePlan(raw: Record<string, unknown>): PhasePlan {
  const arr = (key: string) =>
    Array.isArray(raw[key]) ? (raw[key] as string[]).map(String) : [];
  return {
    warmup: arr("warmup"),
    focus: arr("focus"),
    timed: arr("timed"),
    mixed: arr("mixed"),
    mistakes: arr("mistakes").length ? arr("mistakes") : arr("review"),
    takeaway: arr("takeaway"),
    complete: [],
  };
}

export function buildSessionPlan(
  allQuestions: Question[],
  focusSkill: string | null,
  priorWrongIds: string[] = [],
  options?: { slowMode?: boolean }
): PhasePlan {
  const counts = options?.slowMode ? SLOW_COUNTS : DEFAULT_COUNTS;
  const active = allQuestions.filter((q) => q.status !== "draft");
  const bank = active.length ? active : allQuestions;

  const used = new Set<string>();
  const easy = bank.filter((q) => q.difficulty <= 2);
  const focusPool = focusSkill
    ? bank.filter((q) => q.skill === focusSkill)
    : bank.filter((q) => q.difficulty >= 2 && q.difficulty <= 3);
  const mixedPool = bank.filter((q) => q.difficulty >= 2);
  const harder = bank.filter((q) => q.difficulty >= 3);

  const warmup = pickUnique(easy.length ? easy : bank, counts.warmup, used);
  const focus = pickUnique(focusPool.length ? focusPool : mixedPool, counts.focus, used);
  const timed = pickUnique(harder.length ? harder : mixedPool, counts.timed, used);
  const mixed = pickUnique(mixedPool, counts.mixed, used);
  const timedAll = [...timed, ...mixed];

  const mistakePool = bank.filter((q) => priorWrongIds.includes(q.id));
  const mistakes = pickUnique(
    mistakePool.length ? mistakePool : focus.length ? focus : timedAll,
    Math.min(3, mistakePool.length || 2),
    used
  );

  return {
    warmup: warmup.map((q) => q.id),
    focus: focus.map((q) => q.id),
    timed: timedAll.map((q) => q.id),
    mixed: [],
    mistakes: mistakes.map((q) => q.id),
    takeaway: [],
    complete: [],
  };
}

export function getPhaseQuestionIds(plan: PhasePlan, phase: SessionPhase): string[] {
  if (phase === "complete" || phase === "takeaway") return [];
  return plan[phase] ?? [];
}

export function getNextPhase(phase: SessionPhase): SessionPhase {
  const order: SessionPhase[] = [
    "warmup",
    "focus",
    "timed",
    "mixed",
    "mistakes",
    "takeaway",
    "complete",
  ];
  const idx = order.indexOf(phase);
  return order[Math.min(idx + 1, order.length - 1)];
}

export function getWrongQuestionIdsFromSession(
  attempts: Attempt[],
  phasePlan: PhasePlan
): string[] {
  const sessionQuestionIds = new Set([
    ...phasePlan.warmup,
    ...phasePlan.focus,
    ...phasePlan.timed,
    ...phasePlan.mixed,
  ]);
  return [
    ...new Set(
      attempts
        .filter((a) => sessionQuestionIds.has(a.question_id) && !a.is_correct)
        .map((a) => a.question_id)
    ),
  ];
}
