import type { Attempt, Question } from "./types";

export type QuestionHistory = {
  /** How many times each question was attempted */
  seenCount: Map<string, number>;
  /** Most recent attempt timestamp per question */
  lastSeenAt: Map<string, string>;
  /** Question IDs from the last N attempts (cross-session) */
  recentQuestionIds: Set<string>;
  /** Question IDs attempted in the current session */
  sessionQuestionIds: Set<string>;
};

const DEFAULT_RECENT_LIMIT = 120;
const RECENT_SESSION_ATTEMPTS = 40;
const MAX_SEEN_BEFORE_EXCLUSION = 4;

export function buildQuestionHistory(
  attempts: Attempt[],
  options?: { recentLimit?: number; sessionId?: string | null }
): QuestionHistory {
  const recentLimit = options?.recentLimit ?? DEFAULT_RECENT_LIMIT;
  const sorted = [...attempts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const seenCount = new Map<string, number>();
  const lastSeenAt = new Map<string, string>();
  const recentQuestionIds = new Set<string>();
  const sessionQuestionIds = new Set<string>();

  for (const attempt of sorted) {
    const id = attempt.question_id;
    seenCount.set(id, (seenCount.get(id) ?? 0) + 1);
    if (!lastSeenAt.has(id)) lastSeenAt.set(id, attempt.created_at);
    if (options?.sessionId && attempt.session_id === options.sessionId) {
      sessionQuestionIds.add(id);
    }
  }

  for (const attempt of sorted.slice(0, recentLimit)) {
    recentQuestionIds.add(attempt.question_id);
  }

  return { seenCount, lastSeenAt, recentQuestionIds, sessionQuestionIds };
}

export function freshnessScore(questionId: string, history: QuestionHistory): number {
  const seen = history.seenCount.get(questionId) ?? 0;
  const inSession = history.sessionQuestionIds.has(questionId) ? 10_000 : 0;
  const recent = history.recentQuestionIds.has(questionId) ? 600 : 0;

  let recencyPenalty = 0;
  const lastSeen = history.lastSeenAt.get(questionId);
  if (lastSeen) {
    const hours = (Date.now() - new Date(lastSeen).getTime()) / 3_600_000;
    if (hours < 24) recencyPenalty = 500;
    else if (hours < 72) recencyPenalty = 250;
    else if (hours < 168) recencyPenalty = 100;
    else if (hours < 720) recencyPenalty = 40;
  }

  return inSession + recent + recencyPenalty + seen * 100;
}

export function isExcludedFromSelection(questionId: string, history: QuestionHistory): boolean {
  const seen = history.seenCount.get(questionId) ?? 0;
  return seen >= MAX_SEEN_BEFORE_EXCLUSION;
}

/** Prefer unseen questions; deprioritize recently seen across sessions */
export function rankByFreshness(pool: Question[], history: QuestionHistory): Question[] {
  return [...pool].sort((a, b) => freshnessScore(a.id, history) - freshnessScore(b.id, history));
}

/** Prefer harder variations and unseen siblings when reinforcing a skill */
export function rankForSkillPractice(
  pool: Question[],
  source: Question,
  history: QuestionHistory
): Question[] {
  const skill = source.skill ?? source.skill_tag;
  return [...pool].sort((a, b) => {
    const fresh = freshnessScore(a.id, history) - freshnessScore(b.id, history);
    if (fresh !== 0) return fresh;

    const harderRank = (q: Question) => {
      if (q.variationType === "harder") return 0;
      if (q.parentQuestionId === source.id || q.parentQuestionId === source.parentQuestionId) return 1;
      if (q.difficulty > source.difficulty) return 2;
      if (q.difficulty === source.difficulty) return 3;
      return 4;
    };
    return harderRank(a) - harderRank(b);
  }).filter((q) => (q.skill === skill || q.skill_tag === skill) && q.id !== source.id);
}

/** Pick a variation of the same skill when the bank is exhausted */
export function pickVariation(
  pool: Question[],
  source: Question,
  used: Set<string>,
  history: QuestionHistory
): Question | null {
  const candidates = rankByFreshness(
    pool.filter(
      (q) =>
        q.id !== source.id &&
        !used.has(q.id) &&
        (q.skill === source.skill || q.skill_tag === source.skill_tag) &&
        (q.parentQuestionId === source.id ||
          q.parentQuestionId === source.parentQuestionId ||
          q.variationType === "harder" ||
          q.difficulty >= source.difficulty)
    ),
    history
  );
  return candidates[0] ?? null;
}

export function collectSessionQuestionIds(phasePlan: Record<string, string[]>): Set<string> {
  const ids = new Set<string>();
  for (const key of ["warmup", "focus", "mixed", "timed", "mistakes"]) {
    for (const id of phasePlan[key] ?? []) ids.add(id);
  }
  return ids;
}

export function questionIdsFromAttempts(attempts: Attempt[]): string[] {
  return [...new Set(attempts.map((a) => a.question_id))];
}
