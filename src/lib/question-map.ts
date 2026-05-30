import type { ConfidenceLevel, MistakeType, Question } from "./types";

const MISTAKE_TYPES: MistakeType[] = [
  "careless",
  "concept_gap",
  "timing",
  "misread",
  "vocabulary",
  "setup_error",
];

function parseChoices(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  return [];
}

function parseMistakeTypes(raw: unknown): MistakeType[] {
  if (!Array.isArray(raw)) return ["concept_gap"];
  return raw
    .map(String)
    .filter((t): t is MistakeType => MISTAKE_TYPES.includes(t as MistakeType));
}

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(String);
}

export function mapQuestionRow(row: Record<string, unknown>): Question {
  const questionText = String(row.question_text ?? row.prompt ?? "");
  const skill = String(row.skill ?? row.skill_tag ?? "general");
  const correctAnswer = String(row.correct_answer ?? "");
  const estimatedTime = Number(row.estimated_time ?? row.estimated_seconds ?? 90);

  return {
    id: String(row.id),
    testType: (row.test_type as Question["testType"]) ?? "sat",
    section: (row.section as Question["section"]) ?? "math",
    skill,
    subskill: row.subskill ? String(row.subskill) : null,
    difficulty: Number(row.difficulty ?? 2),
    questionText,
    choices: parseChoices(row.choices),
    correctAnswer,
    explanation: String(row.explanation ?? ""),
    conceptExplanation: row.concept_explanation ? String(row.concept_explanation) : null,
    formulaOrRule: row.formula_or_rule ? String(row.formula_or_rule) : null,
    formulaLatex: row.formula_latex ? String(row.formula_latex) : null,
    underlyingConcept: row.underlying_concept ? String(row.underlying_concept) : null,
    commonMistakes: parseStringArray(row.common_mistakes),
    mistakeTypes: parseMistakeTypes(row.mistake_types).length
      ? parseMistakeTypes(row.mistake_types)
      : ["concept_gap"],
    estimatedTime,
    passage: row.passage_text
      ? {
          passageText: String(row.passage_text),
          difficulty: Number(row.passage_difficulty ?? row.difficulty ?? 2),
          tone: row.passage_tone ? String(row.passage_tone) : null,
          topic: row.passage_topic ? String(row.passage_topic) : null,
          readingSkill: row.reading_skill ? String(row.reading_skill) : null,
          estimatedReadSeconds: Number(row.passage_read_time_seconds ?? estimatedTime),
        }
      : null,
    status: row.status === "draft" ? "draft" : "active",
    prompt: questionText,
    skill_tag: skill,
    correct_answer: correctAnswer,
    estimated_seconds: estimatedTime,
    questionStyle: row.question_style ? String(row.question_style) : null,
    commonMistakeExplanation: row.common_mistake_explanation
      ? String(row.common_mistake_explanation)
      : null,
    blueprintHash: row.blueprint_hash ? String(row.blueprint_hash) : null,
    contentHash: row.content_hash ? String(row.content_hash) : null,
    parentQuestionId: row.parent_question_id ? String(row.parent_question_id) : null,
    variationType: (row.variation_type as Question["variationType"]) ?? "base",
    generatedBy: (row.generated_by as Question["generatedBy"]) ?? "seed",
    validationStatus: (row.validation_status as Question["validationStatus"]) ?? "approved",
  };
}

export function mapAttemptRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    student_id: String(row.student_id),
    question_id: String(row.question_id),
    session_id: row.session_id ? String(row.session_id) : null,
    answer: String(row.answer),
    is_correct: Boolean(row.is_correct),
    time_taken_seconds: Number(row.time_taken_seconds),
    confidence: (row.confidence as ConfidenceLevel | null) ?? null,
    mistake_type: (row.mistake_type as MistakeType | null) ?? null,
    understood_explanation:
      row.understood_explanation != null ? Boolean(row.understood_explanation) : null,
    review_later: Boolean(row.review_later),
    retry_index: Number(row.retry_index ?? 0),
    used_simpler_explanation: Boolean(row.used_simpler_explanation),
    viewed_formula: Boolean(row.viewed_formula),
    requested_similar: Boolean(row.requested_similar),
    mistake_recovered: Boolean(row.mistake_recovered),
    arena_completed: Boolean(row.arena_completed),
    parent_attempt_id: row.parent_attempt_id ? String(row.parent_attempt_id) : null,
    created_at: String(row.created_at),
  };
}
