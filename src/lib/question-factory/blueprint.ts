import { createHash } from "crypto";
import type { Question } from "@/lib/types";

export type QuestionSubject = "math" | "reading";

export type QuestionStyle =
  | "computation"
  | "word-problem"
  | "passage-main-idea"
  | "passage-evidence"
  | "passage-vocabulary"
  | "passage-inference"
  | "grammar"
  | "data-interpretation";

export type QuestionBlueprint = {
  subject: QuestionSubject;
  skill: string;
  subskill: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  questionStyle: QuestionStyle;
  commonMistake: string;
  formula: string | null;
  conceptFramework: string;
  testType?: "sat";
  topic?: string;
  tone?: string;
};

export type BlueprintPreset = QuestionBlueprint & { label: string };

const STYLE_BY_SKILL: Record<string, QuestionStyle> = {
  "algebra-linear": "computation",
  "percent-ratios": "word-problem",
  "geometry-basics": "word-problem",
  functions: "computation",
  probability: "word-problem",
  "data-interpretation": "data-interpretation",
  "reading-main-idea": "passage-main-idea",
  "reading-evidence": "passage-evidence",
  "reading-vocabulary": "passage-vocabulary",
  "reading-inference": "passage-inference",
  "writing-grammar": "grammar",
};

const FRAMEWORK_BY_SKILL: Record<string, string> = {
  "algebra-linear": "Isolate the variable using inverse operations; check by substitution.",
  "percent-ratios": "Translate words to an equation or proportion; label units.",
  "geometry-basics": "Draw or label the figure; apply area/perimeter formulas.",
  functions: "Substitute the input; simplify step by step.",
  probability: "Count favorable outcomes over total outcomes.",
  "data-interpretation": "Read axes/units; estimate or interpolate carefully.",
  "reading-main-idea": "Ask what the whole passage is mostly about, not one detail.",
  "reading-evidence": "Pick lines that directly prove the claim—avoid extremes.",
  "reading-vocabulary": "Use nearby context; ignore the most common definition if it fails.",
  "reading-inference": "Stay close to explicit text; avoid leaps.",
  "writing-grammar": "Identify independent clauses; fix run-ons and comma splices.",
};

const MISTAKE_BY_SKILL: Record<string, string> = {
  "algebra-linear": "Moving terms to the wrong side or dividing incorrectly.",
  "percent-ratios": "Using the wrong base or forgetting to convert percent to decimal.",
  "geometry-basics": "Mixing up area and perimeter formulas.",
  functions: "Order-of-operations errors after substitution.",
  probability: "Counting total outcomes incorrectly.",
  "data-interpretation": "Misreading the scale or extrapolating too far.",
  "reading-main-idea": "Choosing a detail instead of the overall point.",
  "reading-evidence": "Picking lines that mention the topic but do not prove the claim.",
  "reading-vocabulary": "Picking the most common definition without context.",
  "reading-inference": "Over-interpreting beyond what the text supports.",
  "writing-grammar": "Joining two sentences with only a comma.",
};

const FORMULA_BY_SKILL: Record<string, string | null> = {
  "algebra-linear": "ax + b = c  →  x = (c − b) / a",
  "percent-ratios": "part = (percent / 100) × whole",
  "geometry-basics": "rectangle area = length × width",
  functions: "f(a) means replace x with a in the rule",
  probability: "P(event) = favorable / total",
  "data-interpretation": "slope ≈ (change in y) / (change in x)",
  "reading-main-idea": null,
  "reading-evidence": null,
  "reading-vocabulary": null,
  "reading-inference": null,
  "writing-grammar": "Two independent clauses need a period, semicolon, or conjunction.",
};

export const BLUEPRINT_PRESETS: BlueprintPreset[] = [
  "algebra-linear",
  "percent-ratios",
  "geometry-basics",
  "functions",
  "probability",
  "data-interpretation",
  "reading-main-idea",
  "reading-evidence",
  "reading-vocabulary",
  "reading-inference",
  "writing-grammar",
].map((skill) => ({
  label: skill.replace(/-/g, " "),
  subject: skill.startsWith("reading") || skill === "writing-grammar" ? "reading" : "math",
  skill,
  subskill: skill,
  difficulty: 2 as const,
  questionStyle: STYLE_BY_SKILL[skill] ?? "computation",
  commonMistake: MISTAKE_BY_SKILL[skill] ?? "Rushing without checking each step.",
  formula: FORMULA_BY_SKILL[skill] ?? null,
  conceptFramework: FRAMEWORK_BY_SKILL[skill] ?? "Read carefully, then apply the core rule.",
  testType: "sat" as const,
}));

export function blueprintForSkill(
  skill: string,
  difficulty: QuestionBlueprint["difficulty"] = 2
): QuestionBlueprint {
  const preset = BLUEPRINT_PRESETS.find((p) => p.skill === skill);
  if (preset) {
    const { label: _label, ...blueprint } = preset;
    return { ...blueprint, difficulty };
  }

  const subject: QuestionSubject =
    skill.startsWith("reading") || skill.startsWith("writing-") ? "reading" : "math";

  return {
    subject,
    skill,
    subskill: skill,
    difficulty,
    questionStyle: STYLE_BY_SKILL[skill] ?? (subject === "math" ? "computation" : "passage-main-idea"),
    commonMistake: MISTAKE_BY_SKILL[skill] ?? "Rushing without checking each step.",
    formula: FORMULA_BY_SKILL[skill] ?? null,
    conceptFramework: FRAMEWORK_BY_SKILL[skill] ?? "Apply the core concept step by step.",
    testType: "sat",
  };
}

export function blueprintFromQuestion(question: Question): QuestionBlueprint {
  return blueprintForSkill(
    question.skill,
    Math.min(5, Math.max(1, question.difficulty)) as QuestionBlueprint["difficulty"]
  );
}

export function buildBlueprintHash(blueprint: QuestionBlueprint): string {
  const payload = [
    blueprint.testType ?? "sat",
    blueprint.subject,
    blueprint.skill,
    blueprint.subskill,
    blueprint.difficulty,
    blueprint.questionStyle,
  ].join("|");
  return createHash("sha256").update(payload).digest("hex").slice(0, 24);
}

export function normalizeQuestionText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\d+(\.\d+)?/g, "#")
    .replace(/[^a-z# ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildContentHash(questionText: string): string {
  return createHash("sha256").update(normalizeQuestionText(questionText)).digest("hex").slice(0, 24);
}
