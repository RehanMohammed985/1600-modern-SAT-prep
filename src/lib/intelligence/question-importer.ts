import type { Question, MistakeType } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { mapQuestionRow } from "@/lib/question-map";
import { buildContentHash } from "@/lib/question-factory/blueprint";

export type ImportQuestionInput = {
  testType: "sat";
  section: "math" | "reading";
  skill: string;
  subskill?: string | null;
  difficulty: number;
  questionText: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
  conceptExplanation?: string | null;
  formulaOrRule?: string | null;
  formulaLatex?: string | null;
  underlyingConcept?: string | null;
  commonMistakes?: string[];
  mistakeTypes?: MistakeType[];
  estimatedTime?: number;
  passageText?: string | null;
  passageTopic?: string | null;
  passageTone?: string | null;
  readingSkill?: string | null;
  passageReadTimeSeconds?: number | null;
  passageDifficulty?: number | null;
};

export type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
  questionIds: string[];
};

export type ValidationIssue = {
  field: string;
  message: string;
};

const REQUIRED_FIELDS: (keyof ImportQuestionInput)[] = [
  "section",
  "skill",
  "difficulty",
  "questionText",
  "choices",
  "correctAnswer",
  "explanation",
];

const VALID_SECTIONS = new Set(["math", "reading"]);
const VALID_DIFFICULTIES = [1, 2, 3, 4, 5];
const VALID_MISTAKE_TYPES = new Set<MistakeType>([
  "careless", "concept_gap", "timing", "misread", "vocabulary", "sign_error", "setup_error",
]);

export function validateQuestion(input: ImportQuestionInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const field of REQUIRED_FIELDS) {
    const val = input[field];
    if (val === undefined || val === null || (typeof val === "string" && !val.trim())) {
      issues.push({ field, message: `Required field "${field}" is missing or empty` });
    }
  }

  if (!VALID_SECTIONS.has(input.section)) {
    issues.push({ field: "section", message: `Invalid section "${input.section}". Must be "math" or "reading"` });
  }

  if (!VALID_DIFFICULTIES.includes(input.difficulty)) {
    issues.push({ field: "difficulty", message: `Difficulty must be 1-5, got ${input.difficulty}` });
  }

  if (!input.choices || input.choices.length < 2) {
    issues.push({ field: "choices", message: "Must have at least 2 choices" });
  } else if (input.choices.length > 8) {
    issues.push({ field: "choices", message: "Maximum 8 choices allowed" });
  }

  if (input.correctAnswer && input.choices.length > 0) {
    const match = input.choices.some(
      (c) => c.trim().toLowerCase() === input.correctAnswer.trim().toLowerCase()
    );
    if (!match) {
      issues.push({ field: "correctAnswer", message: `Correct answer "${input.correctAnswer}" not found in choices` });
    }
  }

  if (input.explanation && input.explanation.trim().length < 10) {
    issues.push({ field: "explanation", message: "Explanation is too short (min 10 chars)" });
  }

  if (input.mistakeTypes) {
    for (const mt of input.mistakeTypes) {
      if (!VALID_MISTAKE_TYPES.has(mt)) {
        issues.push({ field: "mistakeTypes", message: `Invalid mistake type "${mt}"` });
      }
    }
  }

  return issues;
}

export function toQuestionRow(input: ImportQuestionInput) {
  const contentHash = buildContentHash(input.questionText);

  return {
    prompt: input.questionText,
    question_text: input.questionText,
    choices: input.choices,
    correct_answer: input.correctAnswer,
    explanation: input.explanation,
    skill_tag: input.skill,
    subskill: input.subskill ?? null,
    difficulty: input.difficulty,
    estimated_seconds: input.estimatedTime ?? 90,
    section: input.section,
    test_type: "sat",
    concept_explanation: input.conceptExplanation ?? null,
    formula_or_rule: input.formulaOrRule ?? null,
    formula_latex: input.formulaLatex ?? null,
    underlying_concept: input.underlyingConcept ?? null,
    common_mistakes: input.commonMistakes ?? [],
    mistake_types: input.mistakeTypes ?? [],
    status: "active",
    variation_type: "base",
    generated_by: "manual",
    validation_status: "approved",
    content_hash: contentHash,
    passage_text: input.passageText ?? null,
    passage_topic: input.passageTopic ?? null,
    passage_tone: input.passageTone ?? null,
    reading_skill: input.readingSkill ?? null,
    passage_read_time_seconds: input.passageReadTimeSeconds ?? null,
    passage_difficulty: input.passageDifficulty ?? null,
  };
}

export async function importQuestions(
  questions: ImportQuestionInput[],
  options?: { upsert?: boolean; skipValidation?: boolean }
): Promise<ImportResult> {
  const supabase = await createClient();
  const result: ImportResult = { imported: 0, skipped: 0, errors: [], questionIds: [] };

  const existingHashes = new Set<string>();
  const { data: existingRows } = await supabase
    .from("questions")
    .select("content_hash")
    .not("content_hash", "is", null);

  if (existingRows) {
    for (const row of existingRows) {
      const hash = (row as { content_hash?: string }).content_hash;
      if (hash) existingHashes.add(hash);
    }
  }

  for (const qInput of questions) {
    if (!options?.skipValidation) {
      const issues = validateQuestion(qInput);
      if (issues.length > 0) {
        result.skipped++;
        result.errors.push(`Validation failed for "${qInput.questionText.slice(0, 60)}...": ${issues.map((i) => i.message).join("; ")}`);
        continue;
      }
    }

    const contentHash = buildContentHash(qInput.questionText);

    if (existingHashes.has(contentHash) && !options?.upsert) {
      result.skipped++;
      continue;
    }

    const row = toQuestionRow(qInput);

    const { data, error } = options?.upsert
      ? await supabase.from("questions").upsert(row, { onConflict: "content_hash", ignoreDuplicates: false }).select("id").single()
      : await supabase.from("questions").insert(row).select("id").single();

    if (error) {
      result.errors.push(error.message);
      result.skipped++;
      continue;
    }

    existingHashes.add(contentHash);
    result.imported++;
    if (data) result.questionIds.push((data as { id: string }).id);
  }

  return result;
}

export async function importFromSeedTemplate(
  seedQuestions: Array<{
    testType: "sat";
    section: "math" | "reading";
    skill: string;
    subskill: string | null;
    difficulty: 1 | 2 | 3 | 4 | 5;
    questionText: string;
    choices: string[];
    correctAnswer: string;
    explanation: string;
    conceptExplanation: string;
    formulaOrRule: string | null;
    underlyingConcept: string;
    commonMistakes: string[];
    mistakeTypes: MistakeType[];
    estimatedTime: number;
  }>,
  options?: { upsert?: boolean }
): Promise<ImportResult> {
  const input: ImportQuestionInput[] = seedQuestions.map((s) => ({
    testType: s.testType,
    section: s.section,
    skill: s.skill,
    subskill: s.subskill,
    difficulty: s.difficulty,
    questionText: s.questionText,
    choices: s.choices,
    correctAnswer: s.correctAnswer,
    explanation: s.explanation,
    conceptExplanation: s.conceptExplanation,
    formulaOrRule: s.formulaOrRule,
    underlyingConcept: s.underlyingConcept,
    commonMistakes: s.commonMistakes,
    mistakeTypes: s.mistakeTypes,
    estimatedTime: s.estimatedTime,
  }));

  return importQuestions(input, options);
}

export async function importFromJsonFile(
  jsonFilePath: string,
  options?: { upsert?: boolean }
): Promise<ImportResult> {
  try {
    const fs = await import("fs/promises");
    const content = await fs.readFile(jsonFilePath, "utf-8");
    const data = JSON.parse(content);

    const questions = Array.isArray(data) ? data : data.questions ?? [];
    return importQuestions(questions as ImportQuestionInput[], options);
  } catch (err) {
    return {
      imported: 0,
      skipped: 0,
      errors: [`Failed to read/parse file: ${err instanceof Error ? err.message : String(err)}`],
      questionIds: [],
    };
  }
}
