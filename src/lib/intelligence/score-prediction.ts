import type { Attempt, Profile, Question } from "@/lib/types";
import type { SkillState } from "./knowledge-tracing";
import { estimateTotalScore, skillMasteryLevel } from "./knowledge-tracing";
import { computeSkillIntelligence, type SkillMetrics } from "./skill-score";

export type ScorePrediction = {
  current: number;
  projected: number;
  confidence: number;
  breakdown: {
    math: number;
    readingWriting: number;
  };
  skillRanking: {
    skillTag: string;
    impactPoints: number;
    currentMastery: number;
    masteryLevel: string;
  }[];
};

export type ScoreHistory = {
  date: string;
  predicted: number;
  math: number;
  readingWriting: number;
  actualScore: number | null;
}[];

const SCORE_RANGE = { min: 400, max: 1600 };
const MASTERY_TO_POINTS_MAP: Record<string, { novice: number; developing: number; proficient: number }> = {
  "algebra-linear": { novice: 60, developing: 40, proficient: 20 },
  "percent-ratios": { novice: 40, developing: 25, proficient: 10 },
  "geometry-basics": { novice: 50, developing: 30, proficient: 15 },
  functions: { novice: 70, developing: 45, proficient: 25 },
  probability: { novice: 35, developing: 20, proficient: 10 },
  "data-interpretation": { novice: 50, developing: 30, proficient: 15 },
  "reading-main-idea": { novice: 45, developing: 28, proficient: 12 },
  "reading-evidence": { novice: 55, developing: 35, proficient: 18 },
  "reading-vocabulary": { novice: 40, developing: 22, proficient: 10 },
  "reading-inference": { novice: 55, developing: 35, proficient: 18 },
  "writing-grammar": { novice: 45, developing: 28, proficient: 12 },
};

const DEFAULT_IMPACT = { novice: 50, developing: 30, proficient: 15 };

export function predictScore(
  skillStates: SkillState[],
  profile?: Pick<Profile, "current_score" | "target_score"> | null,
  metrics?: SkillMetrics[]
): ScorePrediction {
  const bktScore = estimateTotalScore(skillStates);
  const current = profile?.current_score ?? bktScore.total;

  const currentPredicted = bktScore.total;
  const blendedCurrent = profile?.current_score
    ? Math.round(current * 0.6 + bktScore.total * 0.4)
    : currentPredicted;

  const clampedCurrent = Math.max(SCORE_RANGE.min, Math.min(SCORE_RANGE.max, blendedCurrent));

  const skillRanking = computeSkillImpactRanking(skillStates, metrics);

  const projectedPoints = skillRanking.reduce(
    (sum, s) => sum + Math.min(sum > 0 ? s.impactPoints * 0.6 : s.impactPoints, 100),
    0
  );

  const projected = Math.min(
    SCORE_RANGE.max,
    Math.max(SCORE_RANGE.min, clampedCurrent + projectedPoints)
  );

  const masteryCounts = skillStates.reduce(
    (acc, s) => {
      const level = skillMasteryLevel(s.pMastered);
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const totalSkills = skillStates.length || 1;

  const confidence =
    0.3 +
    Math.min(0.5, (masteryCounts.proficient || 0) / totalSkills * 0.3) +
    Math.min(0.2, (masteryCounts.mastered || 0) / totalSkills * 0.2);

  const profileTarget = profile?.target_score ?? 1200;
  const gap = profileTarget - clampedCurrent;

  let scalingFactor = 1;
  if (gap < 100) scalingFactor = 0.4;
  else if (gap < 200) scalingFactor = 0.6;
  else if (gap < 300) scalingFactor = 0.8;

  return {
    current: clampedCurrent,
    projected: Math.round(clampedCurrent + projectedPoints * scalingFactor),
    confidence: Math.round(confidence * 100) / 100,
    breakdown: {
      math: bktScore.math,
      readingWriting: bktScore.readingWriting,
    },
    skillRanking: skillRanking.slice(0, 8),
  };
}

function computeSkillImpactRanking(
  skillStates: SkillState[],
  metrics?: SkillMetrics[]
): { skillTag: string; impactPoints: number; currentMastery: number; masteryLevel: string }[] {
  return skillStates
    .map((state) => {
      const impact = MASTERY_TO_POINTS_MAP[state.skillTag] ?? DEFAULT_IMPACT;
      const level = skillMasteryLevel(state.pMastered);
      const pts = impact[level as keyof typeof impact] ?? impact.developing;

      let adjustment = 1;
      if (metrics) {
        const metric = metrics.find((m) => m.skill_tag === state.skillTag);
        if (metric) {
          if (metric.hasConceptGap) adjustment *= 1.3;
          if (metric.hasTimingIssue) adjustment *= 0.7;
          if (metric.retryRate > 0.3) adjustment *= 0.85;
          if (metric.consistency < 0.4) adjustment *= 1.2;
        }
      }

      return {
        skillTag: state.skillTag,
        impactPoints: Math.round(pts * adjustment),
        currentMastery: Math.round(state.pMastered * 100),
        masteryLevel: level,
      };
    })
    .sort((a, b) => b.impactPoints - a.impactPoints);
}

export function estimateScoreFromStats(
  profile: Pick<Profile, "current_score" | "target_score"> | null,
  metrics: SkillMetrics[]
): ScorePrediction {
  const avgSkillScore = metrics.length
    ? metrics.reduce((s, m) => s + m.skillScore, 0) / metrics.length
    : 0.3;

  const baseScore = profile?.current_score ?? 800;
  const scoreWidth = 800;
  const scoreFromSkills = Math.round(400 + avgSkillScore * 1200);
  const blended = profile?.current_score
    ? Math.round(baseScore * 0.5 + scoreFromSkills * 0.5)
    : scoreFromSkills;

  const weakCount = metrics.filter((m) => m.skillScore < 0.6).length;
  const projectedGain = weakCount * 25;
  const projected = Math.min(1600, blended + projectedGain);

  return {
    current: blended,
    projected,
    confidence: Math.min(0.8, 0.3 + metrics.length * 0.02),
    breakdown: {
      math: Math.round(200 + avgSkillScore * 600),
      readingWriting: Math.round(200 + avgSkillScore * 600),
    },
    skillRanking: computeSkillImpactRanking(
      metrics.map((m) => ({
        skillTag: m.skill_tag,
        pMastered: m.skillScore,
        pLearn: 0.15,
        pGuess: 0.15,
        pSlip: 0.1,
        opportunities: m.attempts,
        consecutiveCorrect: m.correct,
        lastAttemptAt: null,
      })),
      metrics
    ),
  };
}

export function daysToTarget(
  prediction: ScorePrediction,
  targetScore: number
): number | null {
  if (prediction.current >= targetScore) return 0;
  if (prediction.projected <= prediction.current) return null;

  const gainPerFutureSession = (prediction.projected - prediction.current) / 20;
  if (gainPerFutureSession <= 0) return null;

  const remaining = targetScore - prediction.current;
  return Math.ceil(remaining / gainPerFutureSession);
}

export function scoreGoalLabel(
  current: number,
  target: number,
  days: number | null
): string {
  const gap = target - current;
  if (gap <= 0) return "You've reached your goal!";
  if (days === null) return `Keep at it — ${gap} points to go`;
  if (days <= 7) return `${gap} points to go — ${days} days of focused work`;
  if (days <= 30) return `${gap} points to go — about ${days} days`;
  return `${gap} points to ${target} — you're on track`;
}
