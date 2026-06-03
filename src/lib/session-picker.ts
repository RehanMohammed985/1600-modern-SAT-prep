import type { Attempt, Question } from "./types";
import type { QuestionHistory } from "./question-history";
import { pickVariation, rankByFreshness, rankForSkillPractice } from "./question-history";
import type { GradeRigor } from "./grade-rigor";
import { filterAndRankForTrack } from "./grade-rigor";
import { phaseCountsForSession, type PhaseCounts } from "./session-length";
import { adaptiveDifficultyForScore } from "./intelligence/question-supply";
import type { SkillMetrics } from "./intelligence/skill-score";
import {
  estimateTheta,
  selectBestItem,
  type ItemParams,
} from "./intelligence/item-response";
import {
  isPlayableReadingQuestion,
  passageGroupId,
  pickReadingSet,
  prepareSessionBank,
} from "./reading-bank";
import { isExcludedFromSelection } from "./question-history";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickUnique(
  pool: Question[],
  count: number,
  used: Set<string>,
  difficultyMin: number,
  difficultyMax: number,
  history: QuestionHistory,
  gradePool?: Question[]
): Question[] {
  const base = gradePool?.length ? gradePool : pool;
  const filtered = base.filter(
    (q) =>
      q.difficulty >= difficultyMin &&
      q.difficulty <= difficultyMax &&
      (q.section !== "reading" || isPlayableReadingQuestion(q))
  );
  const source = filtered.length
    ? filtered
    : base.filter((q) => q.section !== "reading" || isPlayableReadingQuestion(q));

  const ranked = rankByFreshness(source, history);
  const picked: Question[] = [];

  for (const q of ranked) {
    if (used.has(q.id)) continue;
    if (history.sessionQuestionIds.has(q.id)) continue;
    if (isExcludedFromSelection(q.id, history)) continue;

    if (q.section === "reading") {
      if (!q.id.startsWith("reading-set-")) continue;
      const group = passageGroupId(q);
      const siblings = ranked.filter(
        (s) =>
          s.id.startsWith("reading-set-") &&
          s.section === "reading" &&
          passageGroupId(s) === group &&
          !used.has(s.id) &&
          !history.sessionQuestionIds.has(s.id) &&
          !isExcludedFromSelection(s.id, history)
      );
      if (siblings.length > 1) {
        for (const s of siblings.slice(0, 2)) {
          picked.push(s);
          used.add(s.id);
        }
        if (picked.length >= count) break;
        continue;
      }
    }

    picked.push(q);
    used.add(q.id);
    if (picked.length >= count) break;
  }

  if (picked.length < count) {
    const fallback = shuffle(ranked.filter((q) => !isExcludedFromSelection(q.id, history)));
    for (const q of fallback) {
      if (picked.length >= count) break;
      if (used.has(q.id)) continue;
      if (history.recentQuestionIds.has(q.id) && history.seenCount.get(q.id)) {
        const variation = pickVariation(source, q, used, history);
        if (variation) {
          picked.push(variation);
          used.add(variation.id);
          continue;
        }
      }
      picked.push(q);
      used.add(q.id);
    }
  }

  return picked.slice(0, count);
}

function pickPhaseQuestions(
  pool: Question[],
  count: number,
  used: Set<string>,
  difficultyMin: number,
  difficultyMax: number,
  history: QuestionHistory,
  includeReadingSet: boolean,
  gradePool?: Question[]
): Question[] {
  const base = gradePool?.length ? gradePool : pool;
  const mathPool = base.filter((q) => q.section === "math");
  const picked: Question[] = [];

  if (includeReadingSet && count >= 2) {
    const set = pickReadingSet(base, used, 2);
    if (set.length) picked.push(...set);
  }

  const remaining = count - picked.length;
  if (remaining > 0) {
    picked.push(
      ...pickUnique(
        mathPool.length ? mathPool : base,
        remaining,
        used,
        difficultyMin,
        difficultyMax,
        history,
        gradePool
      )
    );
  }

  return picked.slice(0, count);
}

export { prepareSessionBank };

function irtRankedQuestions(
  pool: Question[],
  count: number,
  used: Set<string>,
  history: QuestionHistory,
  theta: number | null,
  attempts: Attempt[],
  recentIds: Set<string>,
  skillTarget?: string
): Question[] {
  const picked: Question[] = [];

  if (theta == null || attempts.length < 3) {
    const ranked = rankByFreshness(pool, history);
    for (const q of ranked) {
      if (picked.length >= count) break;
      if (used.has(q.id)) continue;
      if (isExcludedFromSelection(q.id, history)) continue;
      picked.push(q);
      used.add(q.id);
    }
    return picked;
  }

  const items = new Map<string, ItemParams>();
  const questionMap = new Map<string, Question>();

  for (const q of pool) {
    questionMap.set(q.id, q);
    const defaultDiff = q.difficulty / 5;
    items.set(q.id, {
      questionId: q.id,
      discrimination: 0.8,
      difficulty: defaultDiff,
      guessingParam: q.section === "math" ? 0.2 : 0.25,
    });
  }

  const available: [string, ItemParams][] = [];
  for (const [id, item] of items) {
    if (used.has(id)) continue;
    if (recentIds.has(id)) continue;
    if (isExcludedFromSelection(id, history)) continue;
    if (skillTarget) {
      const q = questionMap.get(id);
      if (q && q.skill !== skillTarget && q.skill_tag !== skillTarget) continue;
    }
    available.push([id, item]);
  }

  const selected = selectBestItem(theta, available, recentIds, skillTarget, questionMap);
  if (selected) {
    const q = questionMap.get(selected.questionId);
    if (q && !used.has(q.id)) {
      picked.push(q);
      used.add(q.id);
    }
  }

  const remaining = count - picked.length;
  if (remaining > 0) {
    const ranked = rankByFreshness(pool, history);
    for (const q of ranked) {
      if (picked.length >= count) break;
      if (used.has(q.id)) continue;
      if (isExcludedFromSelection(q.id, history)) continue;
      picked.push(q);
      used.add(q.id);
    }
  }

  return picked.slice(0, count);
}

export type SessionPlanOptions = {
  slowMode?: boolean;
  timingIssues?: boolean;
  studyMinutes?: number | null;
  history?: QuestionHistory;
  gradeRigor?: GradeRigor;
  skillMetrics?: SkillMetrics[];
  focusSkillMetric?: SkillMetrics | null;
  attempts?: Attempt[];
  theta?: number | null;
};

function buildMistakeReviewPool(
  bank: Question[],
  priorWrongIds: string[],
  history: QuestionHistory
): Question[] {
  const sources = priorWrongIds
    .map((id) => bank.find((q) => q.id === id))
    .filter(Boolean) as Question[];

  if (!sources.length) return [];

  const pool = new Map<string, Question>();
  for (const source of sources) {
    pool.set(source.id, source);
    for (const q of rankForSkillPractice(bank, source, history).slice(0, 6)) {
      pool.set(q.id, q);
    }
  }
  return [...pool.values()];
}

export function buildSmartSessionPlan(
  allQuestions: Question[],
  focusSkill: string | null,
  priorWrongIds: string[] = [],
  options?: SessionPlanOptions
) {
  const bank = prepareSessionBank(allQuestions);
  const gradePool = options?.gradeRigor
    ? filterAndRankForTrack(bank, options.gradeRigor.grade, options.gradeRigor.learningPhase)
    : bank;
  const workingBank = gradePool.length >= 8 ? gradePool : bank;

  const used = new Set<string>();
  const history = options?.history ?? {
    seenCount: new Map(),
    lastSeenAt: new Map(),
    recentQuestionIds: new Set(),
    sessionQuestionIds: new Set(),
  };

  const counts: PhaseCounts = phaseCountsForSession(options?.studyMinutes, {
    slowMode: options?.slowMode,
    timingIssues: options?.timingIssues,
  });

  const diff = options?.gradeRigor?.bounds ?? (
    options?.slowMode
      ? { min: 1, max: 2 }
      : options?.timingIssues
        ? { min: 1, max: 3 }
        : { min: 2, max: 4 }
  );

  const focusMetric = options?.focusSkillMetric;
  const focusTargetDiff = focusMetric
    ? adaptiveDifficultyForScore(focusMetric.skillScore)
    : diff.max;
  const focusDiff = {
    min: diff.min,
    max: Math.min(diff.max, Math.max(diff.min, focusTargetDiff + (focusMetric?.hasConceptGap ? 0 : 1))),
  };

  if (focusMetric?.hasTimingIssue) {
    focusDiff.max = Math.max(diff.min, focusDiff.max - 1);
  }

  const theta = options?.theta ?? null;
  const attempts = options?.attempts ?? [];
  const recentIds = history.recentQuestionIds;

  const includeReading = options?.gradeRigor?.includeReading ?? true;
  const allowTimed = options?.gradeRigor?.allowTimed ?? true;
  const mixedCount = allowTimed ? counts.mixed : counts.mixed + counts.timed;
  const timedCount = allowTimed ? counts.timed : 0;

  const focusPool = focusSkill
    ? workingBank.filter((q) => (q.skill_tag ?? q.skill) === focusSkill)
    : workingBank;

  const warmup = pickPhaseQuestions(
    workingBank,
    counts.warmup,
    used,
    1,
    diff.max,
    history,
    false,
    workingBank
  );

  const focus =
    focusPool.length &&
    focusPool.some((q) => q.section === "math" || isPlayableReadingQuestion(q))
      ? irtRankedQuestions(
          focusPool,
          counts.focus,
          used,
          history,
          theta,
          attempts,
          recentIds,
          focusSkill ?? undefined
        )
      : pickPhaseQuestions(
          workingBank,
          counts.focus,
          used,
          focusDiff.min,
          focusDiff.max,
          history,
          includeReading,
          workingBank
        );

  const mixed = pickPhaseQuestions(
    workingBank,
    mixedCount,
    used,
    diff.min,
    diff.max,
    history,
    includeReading,
    workingBank
  );

  const timed = timedCount
    ? pickPhaseQuestions(
        workingBank,
        timedCount,
        used,
        diff.min,
        diff.max,
        history,
        includeReading,
        workingBank
      )
    : [];

  const mistakePool = buildMistakeReviewPool(workingBank, priorWrongIds, history);
  const mistakes = pickUnique(
    mistakePool.length ? mistakePool : workingBank.filter((q) => priorWrongIds.includes(q.id)),
    counts.mistakes,
    used,
    diff.min,
    diff.max,
    history,
    workingBank
  );

  const allPicked = [...warmup, ...focus, ...mixed, ...timed, ...mistakes];

  return {
    plan: {
      warmup: warmup.map((q) => q.id),
      focus: focus.map((q) => q.id),
      mixed: mixed.map((q) => q.id),
      timed: timed.map((q) => q.id),
      mistakes: mistakes.map((q) => q.id),
      takeaway: [],
      complete: [],
    },
    focusSkill,
    questionsById: Object.fromEntries(allPicked.map((q) => [q.id, q])),
    questionCount: allPicked.length,
  };
}
