import type { Attempt, Profile, Question } from "@/lib/types";
import { computeSkillIntelligence } from "./skill-score";
import { buildSkillStateFromAttempts, type SkillState } from "./knowledge-tracing";
import { estimateScoreFromStats, type ScorePrediction } from "./score-prediction";
import { buildMistakePatterns, detectPatternClusters, type MistakePattern, type MistakeCluster } from "./mistake-patterns";
import { buildReviewCardFromAttempts, getOverdueCards, type ReviewCard } from "./spaced-repetition";
import { generateWeeklyPlan, type WeeklyPlan } from "./study-planner";

export type StudentIntelligence = {
  skillStates: SkillState[];
  skillMetrics: ReturnType<typeof computeSkillIntelligence>;
  scorePrediction: ScorePrediction;
  mistakePatterns: MistakePattern[];
  mistakeClusters: MistakeCluster[];
  reviewCards: ReviewCard[];
  overdueCards: ReviewCard[];
  weakSkills: { skillTag: string; pMastered: number; opportunities: number }[];
  improvingSkills: { skillTag: string; pMastered: number; learningRate: number }[];
  weeklyPlan: WeeklyPlan | null;
  recommendedFocus: string | null;
};

export function buildStudentIntelligence(
  attempts: Attempt[],
  questions: Question[],
  profile?: Pick<Profile, "current_score" | "target_score" | "grade" | "study_minutes_per_day"> | null
): StudentIntelligence {
  const questionsById = new Map(questions.map((q) => [q.id, q]));

  const skillMetrics = computeSkillIntelligence(attempts, questionsById);

  const bySkill = new Map<string, Attempt[]>();
  for (const attempt of attempts) {
    const q = questionsById.get(attempt.question_id);
    const skill = q?.skill ?? q?.skill_tag ?? "general";
    const list = bySkill.get(skill) ?? [];
    list.push(attempt);
    bySkill.set(skill, list);
  }

  const skillStates: SkillState[] = [];
  for (const [skillTag, skillAttempts] of bySkill) {
    const { state } = buildSkillStateFromAttempts(skillTag, skillAttempts);
    skillStates.push(state);
  }

  if (skillStates.length === 0 && skillMetrics.length > 0) {
    for (const m of skillMetrics) {
      skillStates.push({
        skillTag: m.skill_tag,
        pMastered: m.skillScore,
        pLearn: 0.15,
        pGuess: 0.15,
        pSlip: 0.1,
        opportunities: m.attempts,
        consecutiveCorrect: m.correct,
        lastAttemptAt: null,
      });
    }
  }

  const scorePrediction = estimateScoreFromStats(
    profile ? { current_score: profile.current_score, target_score: profile.target_score } : null,
    skillMetrics
  );

  const mistakePatterns = buildMistakePatterns(attempts, questionsById);
  const mistakeClusters = detectPatternClusters(mistakePatterns);

  const reviewCards: ReviewCard[] = [];
  for (const [skillTag, skillAttempts] of bySkill) {
    const card = buildReviewCardFromAttempts(skillTag, skillAttempts);
    reviewCards.push(card);
  }

  const overdueCards = getOverdueCards(reviewCards);

  const weakSkills = skillStates
    .filter((s) => s.pMastered < 0.55 && s.opportunities >= 2)
    .map((s) => ({
      skillTag: s.skillTag,
      pMastered: Math.round(s.pMastered * 100) / 100,
      opportunities: s.opportunities,
    }))
    .sort((a, b) => a.pMastered - b.pMastered);

  const improvingSkills = skillStates
    .filter((s) => {
      const metric = skillMetrics.find((m) => m.skill_tag === s.skillTag);
      return metric && metric.skillScore >= 0.7 && s.opportunities >= 2;
    })
    .map((s) => ({
      skillTag: s.skillTag,
      pMastered: Math.round(s.pMastered * 100) / 100,
      learningRate: s.pLearn,
    }));

  let weeklyPlan: WeeklyPlan | null = null;
  try {
    weeklyPlan = generateWeeklyPlan(
      skillStates,
      reviewCards,
      mistakePatterns,
      profile?.study_minutes_per_day ?? 30,
      scorePrediction.current,
      profile?.target_score ?? 1200
    );
  } catch {
    // Weekly plan is optional
  }

  const recommendedFocus = skillStates
    .filter((s) => s.pMastered < 0.5)
    .sort((a, b) => a.pMastered - b.pMastered)[0]?.skillTag ?? null;

  return {
    skillStates,
    skillMetrics,
    scorePrediction,
    mistakePatterns,
    mistakeClusters,
    reviewCards,
    overdueCards,
    weakSkills,
    improvingSkills,
    weeklyPlan,
    recommendedFocus,
  };
}

export function getIntelligenceSummary(
  intelligence: StudentIntelligence
): {
  totalSkillStates: number;
  masteredCount: number;
  proficientCount: number;
  developingCount: number;
  noviceCount: number;
  totalMistakePatterns: number;
  recurringClusters: number;
  overdueReviews: number;
  predictedTotal: number;
  predictedMath: number;
  predictedRW: number;
  topWeakness: string | null;
  topFocus: string | null;
} {
  const masteryLevels = intelligence.skillStates.map((s) => {
    if (s.pMastered >= 0.78) return "mastered";
    if (s.pMastered >= 0.55) return "proficient";
    if (s.pMastered >= 0.35) return "developing";
    return "novice";
  });

  return {
    totalSkillStates: intelligence.skillStates.length,
    masteredCount: masteryLevels.filter((l) => l === "mastered").length,
    proficientCount: masteryLevels.filter((l) => l === "proficient").length,
    developingCount: masteryLevels.filter((l) => l === "developing").length,
    noviceCount: masteryLevels.filter((l) => l === "novice").length,
    totalMistakePatterns: intelligence.mistakePatterns.length,
    recurringClusters: intelligence.mistakeClusters.length,
    overdueReviews: intelligence.overdueCards.length,
    predictedTotal: intelligence.scorePrediction.current,
    predictedMath: intelligence.scorePrediction.breakdown.math,
    predictedRW: intelligence.scorePrediction.breakdown.readingWriting,
    topWeakness: intelligence.weakSkills[0]?.skillTag ?? null,
    topFocus: intelligence.recommendedFocus,
  };
}
