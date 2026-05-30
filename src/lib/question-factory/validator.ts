import { buildContentHash, normalizeQuestionText, type QuestionBlueprint } from "./blueprint";
import type { GeneratedQuestionPack, ValidationIssue, ValidationResult } from "./types";

function choiceMatches(choices: string[], answer: string): boolean {
  const target = answer.trim().toLowerCase();
  return choices.some((c) => c.trim().toLowerCase() === target);
}

function explanationQuality(text: string, correctAnswer: string): ValidationIssue | null {
  if (text.length < 40) {
    return {
      code: "weak_explanation",
      message: "Explanation is too short to be useful.",
      severity: "error",
    };
  }

  const normalized = normalizeQuestionText(text);
  const answerToken = normalizeQuestionText(correctAnswer).split(" ").filter(Boolean)[0];
  if (answerToken && answerToken.length > 2 && !normalized.includes(answerToken)) {
    return {
      code: "weak_explanation",
      message: "Explanation should reference the correct answer or key reasoning.",
      severity: "warning",
    };
  }

  return null;
}

function difficultyHeuristic(text: string, target: number): ValidationIssue | null {
  const words = text.split(/\s+/).filter(Boolean).length;
  const numbers = (text.match(/\d+/g) ?? []).length;

  const expected =
    target <= 2
      ? { minWords: 8, maxWords: 35, maxNumbers: 3 }
      : target === 3
        ? { minWords: 12, maxWords: 55, maxNumbers: 5 }
        : { minWords: 15, maxWords: 90, maxNumbers: 8 };

  if (words < expected.minWords || words > expected.maxWords) {
    return {
      code: "difficulty_mismatch",
      message: `Question length (${words} words) may not match difficulty ${target}.`,
      severity: "warning",
    };
  }

  if (numbers > expected.maxNumbers && target <= 2) {
    return {
      code: "difficulty_mismatch",
      message: "Too many numeric steps for an easy question.",
      severity: "warning",
    };
  }

  return null;
}

function validateVariation(
  label: "easier" | "harder",
  variation: GeneratedQuestionPack["easierVariation"],
  blueprint: QuestionBlueprint
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!variation.questionText || variation.choices.length < 4) {
    issues.push({
      code: "invalid_variation",
      message: `${label} variation is missing text or choices.`,
      severity: "error",
    });
    return issues;
  }

  if (!choiceMatches(variation.choices, variation.correctAnswer)) {
    issues.push({
      code: "missing_correct_in_choices",
      message: `${label} variation correct answer is not in choices.`,
      severity: "error",
    });
  }

  if (label === "easier" && variation.difficulty >= blueprint.difficulty) {
    issues.push({
      code: "difficulty_mismatch",
      message: "Easier variation should be lower difficulty than the base.",
      severity: "warning",
    });
  }

  if (label === "harder" && variation.difficulty <= blueprint.difficulty) {
    issues.push({
      code: "difficulty_mismatch",
      message: "Harder variation should be higher difficulty than the base.",
      severity: "warning",
    });
  }

  return issues;
}

export function validateQuestionPack(
  pack: GeneratedQuestionPack,
  blueprint: QuestionBlueprint,
  existingContentHashes: Set<string> = new Set()
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const contentHash = buildContentHash(pack.questionText);

  if (!pack.questionText || !pack.correctAnswer) {
    issues.push({
      code: "missing_fields",
      message: "Question text or correct answer is missing.",
      severity: "error",
    });
  }

  if (pack.choices.length < 4) {
    issues.push({
      code: "too_few_choices",
      message: "Question must have at least 4 choices.",
      severity: "error",
    });
  }

  if (!choiceMatches(pack.choices, pack.correctAnswer)) {
    issues.push({
      code: "missing_correct_in_choices",
      message: "Correct answer must exactly match one of the choices.",
      severity: "error",
    });
  }

  const explanationIssue = explanationQuality(pack.explanation, pack.correctAnswer);
  if (explanationIssue) issues.push(explanationIssue);

  const diffIssue = difficultyHeuristic(pack.questionText, blueprint.difficulty);
  if (diffIssue) issues.push(diffIssue);

  if (existingContentHashes.has(contentHash)) {
    issues.push({
      code: "duplicate_content",
      message: "A question with very similar content already exists.",
      severity: "error",
    });
  }

  for (const variation of [
    validateVariation("easier", pack.easierVariation, blueprint),
    validateVariation("harder", pack.harderVariation, blueprint),
  ].flat()) {
    issues.push(variation);
  }

  if (
    blueprint.subject === "reading" &&
    !blueprint.skill.startsWith("writing-") &&
    !pack.passage?.passageText
  ) {
    issues.push({
      code: "missing_fields",
      message: "Reading questions require a passage.",
      severity: "error",
    });
  }

  const hasErrors = issues.some((i) => i.severity === "error");
  return { valid: !hasErrors, issues, contentHash };
}

export function collectContentHashes(pack: GeneratedQuestionPack): string[] {
  return [
    buildContentHash(pack.questionText),
    buildContentHash(pack.easierVariation.questionText),
    buildContentHash(pack.harderVariation.questionText),
  ];
}
