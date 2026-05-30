import type { Question } from "./types";
import type { QuestionHistory } from "./question-history";
import { rankByFreshness, rankForSkillPractice } from "./question-history";

const ARENA_FOLLOW_UP_COUNT = 2;

const EMPTY_HISTORY: QuestionHistory = {
  seenCount: new Map(),
  lastSeenAt: new Map(),
  recentQuestionIds: new Set(),
  sessionQuestionIds: new Set(),
};

/** Variations directly tied to the missed question (same factory pack / parent). */
export function findLinkedVariations(bank: Question[], source: Question): Question[] {
  const seen = new Set<string>([source.id]);
  const out: Question[] = [];

  const add = (q: Question) => {
    if (seen.has(q.id)) return;
    seen.add(q.id);
    out.push(q);
  };

  for (const q of bank) {
    if (q.parentQuestionId === source.id) add(q);
  }

  if (source.parentQuestionId) {
    const parent = bank.find((q) => q.id === source.parentQuestionId);
    if (parent) add(parent);
    for (const q of bank) {
      if (q.parentQuestionId === source.parentQuestionId) add(q);
    }
  }

  return out.sort((a, b) => {
    const order = { easier: 2, base: 1, harder: 0 } as const;
    const va = order[a.variationType ?? "base"];
    const vb = order[b.variationType ?? "base"];
    if (va !== vb) return va - vb;
    return b.difficulty - a.difficulty;
  });
}

function sameSkillCandidates(
  bank: Question[],
  source: Question,
  reservedIds: Set<string>,
  history: QuestionHistory
): Question[] {
  const minDiff = source.difficulty;
  const maxDiff = Math.min(5, source.difficulty + 1);

  return rankForSkillPractice(bank, source, history).filter(
    (q) =>
      !reservedIds.has(q.id) &&
      q.choices.length >= 4 &&
      q.difficulty >= minDiff &&
      q.difficulty <= maxDiff
  );
}

/**
 * Two follow-ups: same concept, slightly harder, not identical.
 * Bank-only — no AI.
 */
export function pickArenaFollowUps(
  bank: Question[],
  source: Question,
  reservedIds: Set<string>,
  history: QuestionHistory = EMPTY_HISTORY
): Question[] {
  const picked: Question[] = [];
  const used = new Set(reservedIds);
  used.add(source.id);

  const tryAdd = (q: Question) => {
    if (picked.length >= ARENA_FOLLOW_UP_COUNT) return;
    if (used.has(q.id) || q.choices.length < 4) return;
    picked.push(q);
    used.add(q.id);
  };

  for (const q of findLinkedVariations(bank, source)) {
    tryAdd(q);
  }

  const sameSkill = sameSkillCandidates(bank, source, used, history);

  if (picked.length < ARENA_FOLLOW_UP_COUNT) {
    const harder = sameSkill.find((q) => q.difficulty > source.difficulty) ?? sameSkill[0];
    if (harder) tryAdd(harder);
  }

  if (picked.length < ARENA_FOLLOW_UP_COUNT) {
    const second =
      sameSkill.find((q) => !used.has(q.id) && q.difficulty >= source.difficulty) ??
      rankByFreshness(
        bank.filter(
          (q) =>
            !used.has(q.id) &&
            q.id !== source.id &&
            (q.skill === source.skill || q.skill_tag === source.skill_tag) &&
            q.choices.length >= 4
        ),
        history
      )[0];
    if (second) tryAdd(second);
  }

  return picked.slice(0, ARENA_FOLLOW_UP_COUNT);
}

export function arenaRecoveryStatus(correctCount: number, total: number): "recovered" | "needs_review" {
  return correctCount >= total ? "recovered" : "needs_review";
}
