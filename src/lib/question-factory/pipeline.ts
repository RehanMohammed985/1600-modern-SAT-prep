import { createClient } from "@/lib/supabase/server";
import { mapQuestionRow } from "@/lib/question-map";
import type { Question } from "@/lib/types";
import { buildBlueprintHash, blueprintForSkill, type QuestionBlueprint } from "./blueprint";
import { generateQuestionPack } from "./generator";
import {
  findByContentHash,
  findExistingByBlueprint,
  loadExistingContentHashes,
  storeQuestionPack,
  upsertBlueprintRecord,
} from "./repository";
import type { BlueprintGenerationRequest, FactoryPipelineResult, ValidationIssue } from "./types";
import { collectContentHashes, validateQuestionPack } from "./validator";

const MAX_GENERATION_ATTEMPTS = 2;

export async function runQuestionFactoryPipeline(
  request: BlueprintGenerationRequest
): Promise<FactoryPipelineResult> {
  const supabase = await createClient();
  const blueprint = request.blueprint;

  if (!request.forceRegenerate) {
    const existing = await findExistingByBlueprint(supabase, blueprint);
    if (existing) {
      await upsertBlueprintRecord(supabase, blueprint, "reused", existing.id);
      return {
        ok: true,
        pack: {
          baseQuestionId: existing.id,
          easierQuestionId: existing.id,
          harderQuestionId: existing.id,
          blueprintHash: buildBlueprintHash(blueprint),
          reused: true,
        },
        question: existing,
      };
    }
  }

  const existingHashes = await loadExistingContentHashes(supabase);
  let lastIssues: ValidationIssue[] = [];

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const { pack, error } = await generateQuestionPack(blueprint);
    if (!pack) {
      await upsertBlueprintRecord(supabase, blueprint, "failed", null, [{ message: error }]);
      return { ok: false, error: error ?? "Generation failed." };
    }

    const validation = validateQuestionPack(pack, blueprint, existingHashes);
    lastIssues = validation.issues;

    if (!validation.valid) continue;

    const duplicate = await findByContentHash(supabase, validation.contentHash);
    if (duplicate) {
      await upsertBlueprintRecord(supabase, blueprint, "reused", duplicate.id);
      return {
        ok: true,
        pack: {
          baseQuestionId: duplicate.id,
          easierQuestionId: duplicate.id,
          harderQuestionId: duplicate.id,
          blueprintHash: buildBlueprintHash(blueprint),
          reused: true,
        },
        question: duplicate,
      };
    }

    const stored = await storeQuestionPack(supabase, blueprint, pack, validation.contentHash);
    if (!stored) {
      return {
        ok: false,
        error:
          "Could not store generated questions. Run supabase/migrations/20250527120000_question_factory.sql in Supabase.",
        validationIssues: validation.issues,
      };
    }

    await upsertBlueprintRecord(supabase, blueprint, "generated", stored.baseQuestionId);

    const { data: row } = await supabase
      .from("questions")
      .select("*")
      .eq("id", stored.baseQuestionId)
      .maybeSingle();

    const question = row
      ? mapQuestionRow(row as Record<string, unknown>)
      : buildFallbackQuestion(stored.baseQuestionId, pack, blueprint);

    for (const hash of collectContentHashes(pack)) existingHashes.add(hash);

    return { ok: true, pack: stored, question };
  }

  await upsertBlueprintRecord(supabase, blueprint, "failed", null, lastIssues);
  return {
    ok: false,
    error: "Generated question failed validation after retries.",
    validationIssues: lastIssues,
  };
}

function buildFallbackQuestion(
  id: string,
  pack: NonNullable<Awaited<ReturnType<typeof generateQuestionPack>>["pack"]>,
  blueprint: QuestionBlueprint
): Question {
  return {
    id,
    testType: blueprint.testType ?? "sat",
    section: blueprint.subject,
    skill: blueprint.skill,
    subskill: blueprint.subskill,
    difficulty: blueprint.difficulty,
    questionText: pack.questionText,
    choices: pack.choices,
    correctAnswer: pack.correctAnswer,
    explanation: pack.explanation,
    conceptExplanation: pack.conceptExplanation,
    formulaOrRule: pack.formulaOrRule,
    formulaLatex: pack.formulaLatex,
    underlyingConcept: pack.underlyingConcept,
    commonMistakes: pack.commonMistakes,
    mistakeTypes: pack.mistakeTypes,
    estimatedTime: pack.estimatedTime,
    passage: pack.passage
      ? {
          passageText: pack.passage.passageText,
          difficulty: pack.passage.difficulty,
          tone: pack.passage.tone,
          topic: pack.passage.topic,
          readingSkill: pack.passage.readingSkill,
          estimatedReadSeconds: pack.passage.estimatedReadSeconds,
        }
      : null,
    status: "active",
    prompt: pack.questionText,
    skill_tag: blueprint.skill,
    correct_answer: pack.correctAnswer,
    estimated_seconds: pack.estimatedTime,
  };
}

export async function ensureSkillQuestionBank(
  skill: string,
  difficulty: QuestionBlueprint["difficulty"] = 2,
  minCount = 2
): Promise<Question[]> {
  const supabase = await createClient();
  const { countActiveBySkill, findSimilarInBank } = await import("./repository");

  const current = await countActiveBySkill(supabase, skill, difficulty);
  const results: Question[] = [];

  if (current >= minCount) {
    const pool = await findSimilarInBank(supabase, skill, "00000000-0000-0000-0000-000000000000");
    return pool.filter((q) => q.difficulty === difficulty).slice(0, minCount);
  }

  const needed = minCount - current;
  for (let i = 0; i < needed; i++) {
    const result = await runQuestionFactoryPipeline({
      blueprint: blueprintForSkill(skill, difficulty),
    });
    if (result.ok) results.push(result.question);
  }

  return results;
}

export async function generateSimilarQuestion(
  skill: string,
  difficulty: number,
  excludeId: string
): Promise<{ questionId: string | null; message: string; generated: boolean }> {
  const supabase = await createClient();
  const { findSimilarInBank } = await import("./repository");

  const pool = await findSimilarInBank(supabase, skill, excludeId);
  if (pool.length) {
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return {
      questionId: pick.id,
      message: "Queued a similar question from the bank for your next session.",
      generated: false,
    };
  }

  const result = await runQuestionFactoryPipeline({
    blueprint: blueprintForSkill(
      skill,
      Math.min(5, Math.max(1, difficulty)) as QuestionBlueprint["difficulty"]
    ),
  });

  if (!result.ok) {
    return {
      questionId: null,
      message: result.error ?? "Could not generate a similar question yet.",
      generated: false,
    };
  }

  return {
    questionId: result.question.id,
    message: result.pack.reused
      ? "Found a matching question in the bank for your next session."
      : "Created a new practice question — we'll use it in your next focus block.",
    generated: !result.pack.reused,
  };
}
