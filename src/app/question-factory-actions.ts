"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mapQuestionRow } from "@/lib/question-map";
import {
  blueprintForSkill,
  blueprintFromQuestion,
  runQuestionFactoryPipeline,
  ensureSkillQuestionBank,
  buildEnhancedTutoringReview,
  type QuestionBlueprint,
  type TutoringReview,
  type TutoringReviewInput,
  type FactoryPipelineResult,
} from "@/lib/question-factory";
import type { Question } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function generateQuestionFromBlueprint(
  blueprint: QuestionBlueprint,
  options?: { forceRegenerate?: boolean }
): Promise<FactoryPipelineResult> {
  await requireUser();
  return runQuestionFactoryPipeline({ blueprint, forceRegenerate: options?.forceRegenerate });
}

export async function generateQuestionForSkill(
  skill: string,
  difficulty: QuestionBlueprint["difficulty"] = 2
): Promise<FactoryPipelineResult> {
  await requireUser();
  return runQuestionFactoryPipeline({ blueprint: blueprintForSkill(skill, difficulty) });
}

export async function prefetchSkillQuestionBank(
  skill: string,
  difficulty: QuestionBlueprint["difficulty"] = 2,
  minCount = 2
): Promise<{ count: number; questionIds: string[] }> {
  await requireUser();
  const questions = await ensureSkillQuestionBank(skill, difficulty, minCount);
  return { count: questions.length, questionIds: questions.map((q) => q.id) };
}

export async function fetchTutoringReview(
  input: TutoringReviewInput,
  options?: { useAi?: boolean }
): Promise<TutoringReview> {
  const { user } = await requireUser();
  return buildEnhancedTutoringReview(input, {
    useAi: options?.useAi ?? true,
    userId: user.id,
  });
}

export async function loadFactoryQuestion(questionId: string): Promise<Question | null> {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("questions").select("*").eq("id", questionId).maybeSingle();
  return data ? mapQuestionRow(data as Record<string, unknown>) : null;
}

export async function blueprintFromQuestionId(
  questionId: string
): Promise<QuestionBlueprint | null> {
  const question = await loadFactoryQuestion(questionId);
  return question ? blueprintFromQuestion(question) : null;
}
