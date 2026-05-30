import type { PhasePlan, Question } from "@/lib/types";
import { buildSmartSessionPlan } from "@/lib/session-picker";
import { prioritizeFactoryQuestions } from "@/lib/intelligence/question-supply";
import type { QuestionHistory } from "@/lib/question-history";
import type { GradeRigor } from "@/lib/grade-rigor";
import { pickTopPrioritySkill, recentWrongSkillsOrdered } from "@/lib/question-priority";
import type { SkillMetrics } from "./skill-score";

export function pickAdaptiveFocusSkill(
  metrics: SkillMetrics[],
  recentWrongIds: string[] = [],
  questionsById?: Map<string, { skill: string; skill_tag?: string }>
): string | null {
  const recentSkills = recentWrongSkillsOrdered(recentWrongIds, questionsById ?? new Map());
  return pickTopPrioritySkill(metrics, recentSkills);
}

export function buildAdaptiveSessionPlan(
  allQuestions: Question[],
  metrics: SkillMetrics[],
  priorWrongIds: string[] = [],
  options?: {
    slowMode?: boolean;
    timingIssues?: boolean;
    studyMinutes?: number | null;
    history?: QuestionHistory;
    gradeRigor?: GradeRigor;
  }
): {
  plan: PhasePlan;
  focusSkill: string | null;
  targetSkillScore: number;
  questionsById: Record<string, Question>;
  questionCount: number;
  gradeRigor?: GradeRigor;
} {
  const questionsByIdMap = new Map(allQuestions.map((q) => [q.id, q]));
  const focusSkill = pickAdaptiveFocusSkill(metrics, priorWrongIds, questionsByIdMap);
  const focusMetric = metrics.find((m) => m.skill_tag === focusSkill);

  const { plan, questionsById, questionCount } = buildSmartSessionPlan(
    prioritizeFactoryQuestions(allQuestions),
    focusSkill,
    priorWrongIds,
    {
      ...options,
      skillMetrics: metrics,
      focusSkillMetric: focusMetric ?? null,
    }
  );

  return {
    plan,
    focusSkill,
    targetSkillScore: focusMetric?.skillScore ?? 0.55,
    questionsById,
    questionCount,
    gradeRigor: options?.gradeRigor,
  };
}
