import type { Attempt, PhasePlan, Question } from "@/lib/types";
import { buildSmartSessionPlan } from "@/lib/session-picker";
import { prioritizeFactoryQuestions } from "@/lib/intelligence/question-supply";
import type { QuestionHistory } from "@/lib/question-history";
import type { GradeRigor } from "@/lib/grade-rigor";
import { pickTopPrioritySkill, recentWrongSkillsOrdered } from "@/lib/question-priority";
import type { SkillMetrics } from "./skill-score";
import { estimateTheta, type ItemParams } from "./item-response";

export function pickAdaptiveFocusSkill(
  metrics: SkillMetrics[],
  recentWrongIds: string[] = [],
  questionsById?: Map<string, { skill: string; skill_tag?: string }>
): string | null {
  const recentSkills = recentWrongSkillsOrdered(recentWrongIds, questionsById ?? new Map());
  return pickTopPrioritySkill(metrics, recentSkills);
}

function computeThetaFromAttempts(
  attempts: Attempt[]
): number | null {
  if (attempts.length < 3) return null;
  const items = new Map<string, ItemParams>();
  const responses: { questionId: string; isCorrect: boolean }[] = [];

  for (const a of attempts) {
    const key = a.question_id;
    if (!items.has(key)) {
      items.set(key, {
        questionId: key,
        discrimination: 0.8,
        difficulty: -Math.log((0.5) / (1 - 0.5 || 0.01)),
        guessingParam: 0.25,
      });
    }
    responses.push({ questionId: key, isCorrect: a.is_correct });
  }

  try {
    return estimateTheta(responses, items, 0, 20);
  } catch {
    return null;
  }
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
    attempts?: Attempt[];
    theta?: number | null;
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

  const theta = options?.theta ?? (options?.attempts ? computeThetaFromAttempts(options.attempts) : null);

  const { plan, questionsById, questionCount } = buildSmartSessionPlan(
    prioritizeFactoryQuestions(allQuestions),
    focusSkill,
    priorWrongIds,
    {
      ...options,
      skillMetrics: metrics,
      focusSkillMetric: focusMetric ?? null,
      theta,
      attempts: options?.attempts ?? [],
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
