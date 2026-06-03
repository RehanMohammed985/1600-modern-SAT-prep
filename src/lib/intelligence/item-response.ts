import type { Attempt, Question } from "@/lib/types";

export type ItemParams = {
  questionId: string;
  discrimination: number;
  difficulty: number;
  guessingParam: number;
};

export type ItemStats = {
  questionId: string;
  totalAttempts: number;
  correctCount: number;
  accuracy: number;
  avgTimeSeconds: number;
  discrimination: number;
  difficultyParam: number;
  guessingParam: number;
};

export function computeItemStats(
  questionId: string,
  attempts: Attempt[]
): ItemStats {
  const total = attempts.length;
  const correct = attempts.filter((a) => a.is_correct).length;
  const avgTime = total
    ? attempts.reduce((s, a) => s + a.time_taken_seconds, 0) / total
    : 0;

  const upperHalf = attempts.slice(0, Math.ceil(total / 2));
  const lowerHalf = attempts.slice(Math.floor(total / 2));

  const upperCorrect = upperHalf.filter((a) => a.is_correct).length;
  const lowerCorrect = lowerHalf.filter((a) => a.is_correct).length;

  const pUpper = upperHalf.length ? upperCorrect / upperHalf.length : 0;
  const pLower = lowerHalf.length ? lowerCorrect / lowerHalf.length : 0;

  const discrimination = Math.max(0.1, Math.min(2.0, (pUpper - pLower) * 2));
  const pCorrect = total ? correct / total : 0.5;
  const difficultyParam = -Math.log(pCorrect / (1 - pCorrect || 0.01));

  return {
    questionId,
    totalAttempts: total,
    correctCount: correct,
    accuracy: pCorrect,
    avgTimeSeconds: Math.round(avgTime),
    discrimination: Math.round(discrimination * 100) / 100,
    difficultyParam: Math.round(difficultyParam * 100) / 100,
    guessingParam: 0.25,
  };
}

export function computeItemInformation(
  theta: number,
  item: ItemParams
): number {
  const { discrimination: a, difficulty: b, guessingParam: c } = item;
  const p = probabilityCorrect(theta, item);
  const q = 1 - p;
  const infoNumerator = a * a * q * ((p - c) / (1 - c)) ** 2;
  const infoDenominator = p * (1 - c);
  return infoDenominator > 0 ? infoNumerator / infoDenominator : 0;
}

export function probabilityCorrect(theta: number, item: ItemParams): number {
  const { discrimination: a, difficulty: b, guessingParam: c } = item;
  const exponent = -a * (theta - b);
  const logistic = 1 / (1 + Math.exp(Math.max(-20, Math.min(20, exponent))));
  return c + (1 - c) * logistic;
}

export function estimateTheta(
  responses: { questionId: string; isCorrect: boolean }[],
  items: Map<string, ItemParams>,
  initialTheta: number = 0,
  iterations: number = 20
): number {
  let theta = initialTheta;

  for (let iter = 0; iter < iterations; iter++) {
    let gradient = 0;
    let hessian = 0;

    for (const response of responses) {
      const item = items.get(response.questionId);
      if (!item) continue;

      const p = probabilityCorrect(theta, item);
      const { discrimination: a } = item;

      gradient += a * (response.isCorrect ? 1 : 0) - a * p;
      hessian -= a * a * p * (1 - p);
    }

    if (Math.abs(hessian) < 0.001) break;
    const step = -gradient / hessian;
    theta += step;

    theta = Math.max(-4, Math.min(4, theta));
    if (Math.abs(step) < 0.001) break;
  }

  return theta;
}

export function selectBestItem(
  currentTheta: number,
  availableItems: [string, ItemParams][],
  recentQuestionIds: Set<string>,
  skillTarget?: string,
  questionsById?: Map<string, Question>
): { questionId: string; item: ItemParams } | null {
  let bestId: string | null = null;
  let bestItem: ItemParams | null = null;
  let bestInfo = -1;

  for (const [id, item] of availableItems) {
    if (recentQuestionIds.has(id)) continue;

    if (skillTarget && questionsById) {
      const q = questionsById.get(id);
      if (q && q.skill !== skillTarget && q.skill_tag !== skillTarget) continue;
    }

    const info = computeItemInformation(currentTheta, item);

    const seenPenalty = recentQuestionIds.has(id) ? 999 : 0;
    const score = info - seenPenalty;

    if (score > bestInfo) {
      bestInfo = score;
      bestId = id;
      bestItem = item;
    }
  }

  return bestId && bestItem ? { questionId: bestId, item: bestItem } : null;
}

export function thetaToScore(theta: number): number {
  const scaled = Math.round(500 + theta * 100);
  return Math.max(200, Math.min(800, scaled));
}

export function scoreToTheta(score: number): number {
  return (Math.max(200, Math.min(800, score)) - 500) / 100;
}

export function irtAdaptiveDifficulty(
  theta: number,
  item: ItemParams
): number {
  const p = probabilityCorrect(theta, item);
  if (p >= 0.85) return Math.min(5, Math.round(item.difficulty * 10 + 3));
  if (p >= 0.65) return Math.min(5, Math.round(item.difficulty * 10 + 2));
  if (p >= 0.45) return Math.round(item.difficulty * 10 + 2);
  return Math.max(1, Math.round(item.difficulty * 10 + 1));
}
