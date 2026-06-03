import type { Attempt, MistakeType } from "@/lib/types";

export type BKTParams = {
  pLearn: number;
  pGuess: number;
  pSlip: number;
  pInit: number;
};

export type SkillState = {
  skillTag: string;
  pMastered: number;
  pLearn: number;
  pGuess: number;
  pSlip: number;
  opportunities: number;
  consecutiveCorrect: number;
  lastAttemptAt: string | null;
};

export type BKTUpdateResult = {
  pMastered: number;
  learningRate: number;
  predictedCorrect: number;
};

const DEFAULT_PARAMS: BKTParams = {
  pLearn: 0.15,
  pGuess: 0.15,
  pSlip: 0.10,
  pInit: 0.20,
};

const FORGETTING_DECAY_HOURS = 72;
const FORGETTING_PENALTY_PER_HOUR = 0.005;

export function defaultBKTParams(): BKTParams {
  return { ...DEFAULT_PARAMS };
}

export function initialSkillState(skillTag: string): SkillState {
  return {
    skillTag,
    pMastered: DEFAULT_PARAMS.pInit,
    pLearn: DEFAULT_PARAMS.pLearn,
    pGuess: DEFAULT_PARAMS.pGuess,
    pSlip: DEFAULT_PARAMS.pSlip,
    opportunities: 0,
    consecutiveCorrect: 0,
    lastAttemptAt: null,
  };
}

export function applyForgettingDecay(
  pMastered: number,
  hoursSinceLastAttempt: number
): number {
  if (hoursSinceLastAttempt <= FORGETTING_DECAY_HOURS) return pMastered;
  const decay = (hoursSinceLastAttempt - FORGETTING_DECAY_HOURS) * FORGETTING_PENALTY_PER_HOUR;
  return Math.max(0.05, pMastered - decay);
}

export function bayesianUpdate(
  priorPMastered: number,
  isCorrect: boolean,
  params: BKTParams
): BKTUpdateResult {
  const pCorrectGivenMastered = 1 - params.pSlip;
  const pCorrectGivenNotMastered = params.pGuess;

  const pEvidenceGivenMastered = isCorrect
    ? pCorrectGivenMastered
    : params.pSlip;
  const pEvidenceGivenNotMastered = isCorrect
    ? pCorrectGivenNotMastered
    : 1 - params.pGuess;

  const pEvidence =
    pEvidenceGivenMastered * priorPMastered +
    pEvidenceGivenNotMastered * (1 - priorPMastered);

  const pMasteredGivenEvidence =
    (pEvidenceGivenMastered * priorPMastered) / (pEvidence || 0.0001);

  const pMasteredAfterLearning =
    pMasteredGivenEvidence +
    (1 - pMasteredGivenEvidence) * params.pLearn;

  const clamped = Math.max(0.01, Math.min(0.99, pMasteredAfterLearning));

  const predictedCorrect =
    (1 - params.pSlip) * priorPMastered +
    params.pGuess * (1 - priorPMastered);

  const learningRate = clamped - priorPMastered;

  return {
    pMastered: clamped,
    learningRate: Math.max(0, learningRate),
    predictedCorrect,
  };
}

export function computeConfidenceFromBKT(
  pMastered: number,
  opportunities: number
): number {
  const masteryWeight = 0.7;
  const volumeWeight = 0.3;
  const volumeScore = Math.min(1, opportunities / 12);
  return masteryWeight * pMastered + volumeWeight * volumeScore;
}

export function estimateLearningRate(
  history: { pMastered: number; timestamp: string }[]
): number {
  if (history.length < 3) return DEFAULT_PARAMS.pLearn;
  const recent = history.slice(-3);
  const first = recent[0];
  const last = recent[recent.length - 1];
  if (last.pMastered <= first.pMastered) return 0.02;
  const gain = last.pMastered - first.pMastered;
  return Math.min(0.5, gain / history.length);
}

export function buildSkillStateFromAttempts(
  skillTag: string,
  attempts: Attempt[],
  existingState?: SkillState | null
): { state: SkillState; history: { pMastered: number; timestamp: string }[] } {
  const params = existingState
    ? {
        pLearn: existingState.pLearn,
        pGuess: existingState.pGuess,
        pSlip: existingState.pSlip,
        pInit: existingState.pMastered,
      }
    : DEFAULT_PARAMS;

  let pMastered = existingState?.pMastered ?? params.pInit;
  let consecutiveCorrect = existingState?.consecutiveCorrect ?? 0;
  let opportunities = existingState?.opportunities ?? 0;
  const history: { pMastered: number; timestamp: string }[] = [];

  const sorted = [...attempts].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  for (const attempt of sorted) {
    if (opportunities > 0) {
      const hoursSinceLast =
        (new Date(attempt.created_at).getTime() -
          new Date(sorted[Math.max(0, opportunities - 1)].created_at).getTime()) /
        3_600_000;
      pMastered = applyForgettingDecay(pMastered, hoursSinceLast);
    }

    const result = bayesianUpdate(pMastered, attempt.is_correct, params);
    pMastered = result.pMastered;
    opportunities += 1;
    consecutiveCorrect = attempt.is_correct ? consecutiveCorrect + 1 : 0;

    history.push({ pMastered, timestamp: attempt.created_at });

    const learnerParams = {
      ...params,
      pLearn: estimateLearningRate(history),
    };
    const adjusted = bayesianUpdate(pMastered, attempt.is_correct, learnerParams);
    pMastered = adjusted.pMastered;
  }

  return {
    state: {
      skillTag,
      pMastered,
      pLearn: estimateLearningRate(history),
      pGuess: params.pGuess,
      pSlip: params.pSlip,
      opportunities,
      consecutiveCorrect,
      lastAttemptAt: sorted[sorted.length - 1]?.created_at ?? null,
    },
    history,
  };
}

export function skillMasteryLevel(pMastered: number): "novice" | "developing" | "proficient" | "mastered" {
  if (pMastered < 0.35) return "novice";
  if (pMastered < 0.55) return "developing";
  if (pMastered < 0.78) return "proficient";
  return "mastered";
}

export function estimateTotalScore(
  skillStates: SkillState[],
  baseScore: number = 400,
  maxScore: number = 1600
): { total: number; math: number; readingWriting: number } {
  if (!skillStates.length) return { total: baseScore, math: baseScore / 2, readingWriting: baseScore / 2 };

  const mathStates = skillStates.filter((s) =>
    s.skillTag.startsWith("algebra-") ||
    s.skillTag.startsWith("geometry-") ||
    s.skillTag.startsWith("functions") ||
    s.skillTag.startsWith("percent-") ||
    s.skillTag.startsWith("probability") ||
    s.skillTag.startsWith("data-")
  );
  const rwStates = skillStates.filter((s) =>
    s.skillTag.startsWith("reading-") ||
    s.skillTag.startsWith("writing-")
  );

  const avgMastery = (states: SkillState[]) =>
    states.length ? states.reduce((s, st) => s + st.pMastered, 0) / states.length : 0.3;

  const mathAvg = avgMastery(mathStates.length ? mathStates : skillStates);
  const rwAvg = avgMastery(rwStates.length ? rwStates : skillStates);

  const mathSection = Math.round(200 + mathAvg * 600);
  const rwSection = Math.round(200 + rwAvg * 600);

  return {
    total: mathSection + rwSection,
    math: mathSection,
    readingWriting: rwSection,
  };
}

export function computeAdaptiveDifficulty(
  pMastered: number,
  opportunities: number
): 1 | 2 | 3 | 4 | 5 {
  if (opportunities < 2) return 2;
  if (pMastered < 0.3) return 1;
  if (pMastered < 0.45) return 2;
  if (pMastered < 0.6) return 3;
  if (pMastered < 0.78) return 4;
  return 5;
}
