import type { Question } from "@/lib/types";
import type { QuestionBlueprint } from "@/lib/question-factory";
import { ensureSkillQuestionBank } from "@/lib/question-factory";

/** Prefer factory-generated base questions when assembling adaptive pools. */
export function prioritizeFactoryQuestions(questions: Question[]): Question[] {
  const factory = questions.filter(
    (q) => q.generatedBy === "factory" && q.variationType !== "harder"
  );
  const seed = questions.filter((q) => q.generatedBy !== "factory");
  return [...factory, ...seed];
}

/** Async supply hook for weak skills — generates only when the bank is thin. */
export async function supplyQuestionsForSkill(
  skill: string,
  difficulty: QuestionBlueprint["difficulty"] = 2,
  minCount = 2
): Promise<Question[]> {
  return ensureSkillQuestionBank(skill, difficulty, minCount);
}

export function adaptiveDifficultyForScore(skillScore: number): QuestionBlueprint["difficulty"] {
  if (skillScore < 0.45) return 1;
  if (skillScore < 0.6) return 2;
  if (skillScore < 0.75) return 3;
  if (skillScore < 0.88) return 4;
  return 5;
}
