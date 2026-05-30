import type { Attempt, ConfidenceLevel, Question } from "@/lib/types";

export type SkillMetrics = {
  skill_tag: string;
  attempts: number;
  correct: number;
  accuracy: number;
  speed: number;
  consistency: number;
  confidence: number;
  retention: number;
  skillScore: number;
  retryRate: number;
  reviewUsageRate: number;
  recoveredMistakes: number;
  hasTimingIssue: boolean;
  hasConceptGap: boolean;
};

const WEIGHTS = {
  accuracy: 0.45,
  speed: 0.25,
  consistency: 0.15,
  confidence: 0.1,
  retention: 0.05,
} as const;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function confidenceToScore(c: ConfidenceLevel | null): number {
  if (c === "high") return 1;
  if (c === "medium") return 0.65;
  if (c === "low") return 0.3;
  return 0.5;
}

function speedForAttempt(attempt: Attempt, question: Question): number {
  const limit = question.estimatedTime ?? question.estimated_seconds ?? 90;
  const taken = Math.max(attempt.time_taken_seconds, 1);
  if (taken <= limit) return 1;
  if (taken >= limit * 2) return 0;
  return clamp01(1 - (taken - limit) / limit);
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function computeSkillScore(components: {
  accuracy: number;
  speed: number;
  consistency: number;
  confidence: number;
  retention: number;
}): number {
  return clamp01(
    WEIGHTS.accuracy * components.accuracy +
      WEIGHTS.speed * components.speed +
      WEIGHTS.consistency * components.consistency +
      WEIGHTS.confidence * components.confidence +
      WEIGHTS.retention * components.retention
  );
}

export function computeSkillIntelligence(
  attempts: Attempt[],
  questionsById: Map<string, Question>
): SkillMetrics[] {
  const bySkill = new Map<
    string,
    {
      attempts: Attempt[];
      questionIds: Set<string>;
    }
  >();

  for (const attempt of attempts) {
    const q = questionsById.get(attempt.question_id);
    if (!q) continue;
    const tag = q.skill_tag ?? q.skill;
    const bucket = bySkill.get(tag) ?? { attempts: [], questionIds: new Set() };
    bucket.attempts.push(attempt);
    bucket.questionIds.add(attempt.question_id);
    bySkill.set(tag, bucket);
  }

  return Array.from(bySkill.entries())
    .map(([skill_tag, bucket]) => {
      const sorted = [...bucket.attempts].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const correct = sorted.filter((a) => a.is_correct).length;
      const accuracy = sorted.length ? correct / sorted.length : 0;

      let speedSum = 0;
      let speedCount = 0;
      for (const a of sorted) {
        const q = questionsById.get(a.question_id);
        if (!q) continue;
        speedSum += speedForAttempt(a, q);
        speedCount += 1;
      }
      const speed = speedCount ? speedSum / speedCount : 0.5;

      const recent = sorted.slice(-6);
      const recentBinary = recent.map((a) => (a.is_correct ? 1 : 0));
      const consistency = clamp01(1 - stdDev(recentBinary) * 2);

      const confScores = sorted
        .filter((a) => a.confidence)
        .map((a) => confidenceToScore(a.confidence));
      const confidence = confScores.length
        ? confScores.reduce((s, v) => s + v, 0) / confScores.length
        : 0.5;

      const byQuestion = new Map<string, Attempt[]>();
      for (const a of sorted) {
        const list = byQuestion.get(a.question_id) ?? [];
        list.push(a);
        byQuestion.set(a.question_id, list);
      }
      let retentionHits = 0;
      let retentionTrials = 0;
      for (const [, list] of byQuestion) {
        if (list.length < 2) continue;
        retentionTrials += 1;
        if (list.some((a, i) => i > 0 && a.is_correct)) retentionHits += 1;
      }
      const understood = sorted.filter((a) => a.understood_explanation === true).length;
      const recoveredMistakes = sorted.filter((a) => a.mistake_recovered).length;
      const retentionFromRetries = retentionTrials ? retentionHits / retentionTrials : 0.5;
      const retentionFromUnderstood = sorted.length ? understood / sorted.length : 0;
      const retentionFromRecovery = sorted.length
        ? recoveredMistakes / Math.max(1, sorted.filter((a) => !a.is_correct).length)
        : 0;
      const retention = clamp01(
        retentionFromRetries * 0.45 + retentionFromUnderstood * 0.35 + retentionFromRecovery * 0.2
      );

      const skillScore = computeSkillScore({
        accuracy,
        speed,
        consistency,
        confidence,
        retention,
      });

      const retries = sorted.filter((a) => a.retry_index > 0).length;
      const retryRate = sorted.length ? retries / sorted.length : 0;

      const reviewTouches = sorted.filter(
        (a) =>
          a.review_later ||
          a.viewed_formula ||
          a.used_simpler_explanation ||
          a.requested_similar
      ).length;
      const reviewUsageRate = sorted.length ? reviewTouches / sorted.length : 0;

      let slowMisses = 0;
      let conceptMisses = 0;
      let missCount = 0;
      for (const a of sorted) {
        if (a.is_correct) continue;
        missCount += 1;
        if (a.mistake_type === "timing") slowMisses += 1;
        if (a.mistake_type === "concept_gap" || a.mistake_type === "setup_error") {
          conceptMisses += 1;
        }
      }

      return {
        skill_tag,
        attempts: sorted.length,
        correct,
        accuracy,
        speed,
        consistency,
        confidence,
        retention,
        skillScore,
        retryRate,
        reviewUsageRate,
        recoveredMistakes,
        hasTimingIssue: missCount >= 2 && slowMisses / missCount >= 0.4,
        hasConceptGap: missCount >= 2 && conceptMisses / missCount >= 0.4,
      };
    })
    .sort((a, b) => a.skillScore - b.skillScore);
}
