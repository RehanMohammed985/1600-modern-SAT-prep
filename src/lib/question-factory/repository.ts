import { createClient } from "@/lib/supabase/server";
import { mapQuestionRow } from "@/lib/question-map";
import type { Question } from "@/lib/types";
import { buildBlueprintHash, buildContentHash, type QuestionBlueprint } from "./blueprint";
import type { GeneratedQuestionPack, StoredQuestionPack } from "./types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function packToRow(
  pack: GeneratedQuestionPack,
  blueprint: QuestionBlueprint,
  variationType: "base" | "easier" | "harder",
  parentId: string | null,
  contentHash: string
) {
  const source =
    variationType === "base"
      ? pack
      : variationType === "easier"
        ? pack.easierVariation
        : pack.harderVariation;

  const difficulty =
    variationType === "base"
      ? blueprint.difficulty
      : variationType === "easier"
        ? Math.max(1, blueprint.difficulty - 1)
        : Math.min(5, blueprint.difficulty + 1);

  return {
    prompt: source.questionText,
    question_text: source.questionText,
    choices: source.choices,
    correct_answer: source.correctAnswer,
    explanation: source.explanation,
    skill_tag: blueprint.skill,
    subskill: blueprint.subskill,
    difficulty,
    estimated_seconds: pack.estimatedTime,
    section: blueprint.subject,
    test_type: blueprint.testType ?? "sat",
    concept_explanation:
      variationType === "base" ? pack.conceptExplanation : pack.conceptExplanation,
    formula_or_rule: variationType === "base" ? pack.formulaOrRule : pack.formulaOrRule,
    formula_latex: variationType === "base" ? pack.formulaLatex : null,
    underlying_concept: variationType === "base" ? pack.underlyingConcept : pack.underlyingConcept,
    common_mistakes: variationType === "base" ? pack.commonMistakes : pack.commonMistakes,
    mistake_types: pack.mistakeTypes,
    status: "active",
    question_style: blueprint.questionStyle,
    common_mistake_explanation:
      variationType === "base" ? pack.commonMistakeExplanation : pack.commonMistakeExplanation,
    blueprint_hash: buildBlueprintHash(blueprint),
    content_hash: contentHash,
    parent_question_id: parentId,
    variation_type: variationType,
    generated_by: "factory",
    validation_status: "approved",
    passage_text: variationType === "base" ? pack.passage?.passageText ?? null : null,
    passage_topic: variationType === "base" ? pack.passage?.topic ?? null : null,
    passage_tone: variationType === "base" ? pack.passage?.tone ?? null : null,
    reading_skill: variationType === "base" ? pack.passage?.readingSkill ?? null : null,
    passage_read_time_seconds:
      variationType === "base" ? pack.passage?.estimatedReadSeconds ?? null : null,
    passage_difficulty: variationType === "base" ? pack.passage?.difficulty ?? null : null,
  };
}

export async function findExistingByBlueprint(
  supabase: SupabaseClient,
  blueprint: QuestionBlueprint
): Promise<Question | null> {
  const hash = buildBlueprintHash(blueprint);
  const { data } = await supabase
    .from("questions")
    .select("*")
    .eq("blueprint_hash", hash)
    .eq("variation_type", "base")
    .eq("status", "active")
    .eq("validation_status", "approved")
    .limit(1)
    .maybeSingle();

  return data ? mapQuestionRow(data as Record<string, unknown>) : null;
}

export async function loadExistingContentHashes(supabase: SupabaseClient): Promise<Set<string>> {
  const { data } = await supabase
    .from("questions")
    .select("content_hash")
    .not("content_hash", "is", null)
    .limit(500);

  return new Set(
    (data ?? [])
      .map((row) => (row as { content_hash?: string }).content_hash)
      .filter(Boolean) as string[]
  );
}

export async function findByContentHash(
  supabase: SupabaseClient,
  contentHash: string
): Promise<Question | null> {
  const { data } = await supabase
    .from("questions")
    .select("*")
    .eq("content_hash", contentHash)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  return data ? mapQuestionRow(data as Record<string, unknown>) : null;
}

export async function storeQuestionPack(
  supabase: SupabaseClient,
  blueprint: QuestionBlueprint,
  pack: GeneratedQuestionPack,
  contentHash: string
): Promise<StoredQuestionPack | null> {
  const baseHash = buildContentHash(pack.questionText);
  const easierHash = buildContentHash(pack.easierVariation.questionText);
  const harderHash = buildContentHash(pack.harderVariation.questionText);

  const { data, error } = await supabase.rpc("store_factory_questions", {
    blueprint_payload: {
      blueprint,
      blueprintHash: buildBlueprintHash(blueprint),
    },
    questions_payload: [
      packToRow(pack, blueprint, "base", null, baseHash),
      packToRow(pack, blueprint, "easier", null, easierHash),
      packToRow(pack, blueprint, "harder", null, harderHash),
    ],
  });

  if (error || !data) {
    console.error("[question-factory] store failed:", error?.message);
    return null;
  }

  const result = data as {
    baseQuestionId?: string;
    easierQuestionId?: string;
    harderQuestionId?: string;
  };

  if (!result.baseQuestionId) return null;

  return {
    baseQuestionId: result.baseQuestionId,
    easierQuestionId: result.easierQuestionId ?? result.baseQuestionId,
    harderQuestionId: result.harderQuestionId ?? result.baseQuestionId,
    blueprintHash: buildBlueprintHash(blueprint),
    reused: false,
  };
}

export async function upsertBlueprintRecord(
  supabase: SupabaseClient,
  blueprint: QuestionBlueprint,
  status: "generated" | "failed" | "reused",
  baseQuestionId: string | null,
  validationErrors: unknown[] = []
): Promise<void> {
  await supabase.from("question_blueprints").upsert(
    {
      blueprint_hash: buildBlueprintHash(blueprint),
      blueprint,
      base_question_id: baseQuestionId,
      status,
      validation_errors: validationErrors,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "blueprint_hash" }
  );
}

export async function countActiveBySkill(
  supabase: SupabaseClient,
  skill: string,
  difficulty?: number
): Promise<number> {
  let query = supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("skill_tag", skill)
    .eq("status", "active")
    .eq("variation_type", "base");

  if (difficulty != null) query = query.eq("difficulty", difficulty);

  const { count } = await query;
  return count ?? 0;
}

export async function findSimilarInBank(
  supabase: SupabaseClient,
  skill: string,
  excludeId: string,
  limit = 20
): Promise<Question[]> {
  const { data } = await supabase
    .from("questions")
    .select("*")
    .eq("skill_tag", skill)
    .eq("status", "active")
    .neq("id", excludeId)
    .limit(limit);

  return (data ?? []).map((row) => mapQuestionRow(row as Record<string, unknown>));
}
