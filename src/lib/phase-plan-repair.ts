import type { PhasePlan, Question } from "./types";
import { isDatabaseQuestionId, isSessionQuestionId } from "./utils";

export function phasePlanHasInvalidIds(plan: PhasePlan): boolean {
  const ids = [
    ...plan.warmup,
    ...plan.focus,
    ...plan.timed,
    ...plan.mixed,
    ...plan.mistakes,
  ];
  return ids.some((id) => !isSessionQuestionId(id));
}

export function filterUuidIds(ids: string[]): string[] {
  return ids.filter(isDatabaseQuestionId);
}

/** Replace legacy mock IDs with real question UUIDs from the database. */
export function repairPhasePlan(plan: PhasePlan, bank: Question[]): PhasePlan {
  if (!bank.length) return plan;

  const used = new Set<string>();
  const activeBank = bank.filter((q) => q.status !== "draft" && isDatabaseQuestionId(q.id));
  const pool = activeBank.length ? activeBank : bank.filter((q) => isDatabaseQuestionId(q.id));

  const fix = (ids: string[]) => {
    const out: string[] = [];
    for (const id of ids) {
      if (id.startsWith("reading-set-")) {
        out.push(id);
        continue;
      }
      if (isDatabaseQuestionId(id) && pool.some((q) => q.id === id)) {
        if (!used.has(id)) {
          used.add(id);
          out.push(id);
        }
        continue;
      }
      const replacement = pool.find((q) => !used.has(q.id));
      if (replacement) {
        used.add(replacement.id);
        out.push(replacement.id);
      }
    }
    return out;
  };

  return {
    warmup: fix(plan.warmup),
    focus: fix(plan.focus),
    timed: fix(plan.timed),
    mixed: fix(plan.mixed),
    mistakes: fix(plan.mistakes),
    takeaway: plan.takeaway,
    complete: plan.complete,
  };
}
