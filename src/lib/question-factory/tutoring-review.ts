import { inferMistakeType, simplifyExplanation } from "@/lib/tutoring";
import { buildTutoringBreakdown } from "@/lib/solution-steps";
import type { MistakeType, Question } from "@/lib/types";
import {
  cacheTutoringReview,
  getCachedTutoringReview,
} from "@/lib/ai/cache";
import { checkRateLimit, rateLimitKey } from "@/lib/ai/rate-limit";
import { generateTextFast, generateTextStrong, isAiConfigured } from "@/lib/ai/provider";
import { tutoringReviewEnhancementPrompt } from "./prompts";
import { extractJsonObject } from "./parser";
import type { TutoringReview, TutoringReviewInput } from "./types";

export function needsAiEnhancement(input: TutoringReviewInput): boolean {
  const q = input.question;
  const thinExplanation = q.explanation.trim().length < 120;
  const missingConcept = !q.conceptExplanation?.trim() && !q.underlyingConcept?.trim();
  const missingSteps = !q.explanation.includes(".") && q.explanation.length < 80;
  return thinExplanation || missingConcept || missingSteps;
}

function crispSentence(text: string, maxLen = 140): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  const cut = trimmed.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trim() + "…";
}

function matchWrongChoice(input: TutoringReviewInput): string | null {
  const selected = input.selectedAnswer.trim().toLowerCase();
  return (
    input.question.choices.find((c) => c.trim().toLowerCase() === selected) ?? null
  );
}

function defaultWhyWrong(input: TutoringReviewInput): string {
  const picked = matchWrongChoice(input) ?? input.selectedAnswer;
  if (picked.trim().toLowerCase() === input.question.correctAnswer.trim().toLowerCase()) {
    return "Your answer was close — recheck the final step or wording.";
  }
  const firstSentence =
    input.question.explanation.split(/(?<=[.!?])\s+/)[0] ?? input.question.explanation;
  return crispSentence(`"${picked}" doesn't match the correct approach. ${firstSentence}`);
}

function defaultCommonMistake(input: TutoringReviewInput): string {
  if (input.question.commonMistakeExplanation) {
    return input.question.commonMistakeExplanation;
  }
  if (input.question.commonMistakes.length) {
    return input.question.commonMistakes[0];
  }
  return "A lot of students pick an answer that looks right at first glance without checking every part of the question.";
}

function defaultRememberNextTime(input: TutoringReviewInput, mistakeType: MistakeType): string {
  if (mistakeType === "timing") {
    return "Write down what the question is asking before you start solving.";
  }
  if (mistakeType === "vocabulary") {
    return "Circle the key word and find context clues in the sentence around it.";
  }
  if (input.question.formulaOrRule) {
    return `Before you pick, ask: does my answer use ${input.question.formulaOrRule.split(/[.!?]/)[0]}?`;
  }
  return "After you pick, quickly check: does my answer match every detail in the question?";
}

function defaultPracticeNext(input: TutoringReviewInput, mistakeType: MistakeType): string {
  if (mistakeType === "timing") {
    return `Practice ${input.question.skill.replace(/-/g, " ")} with a timer, one step at a time.`;
  }
  if (mistakeType === "vocabulary") {
    return "Circle the key word in the question, then find context clues before you pick.";
  }
  if (input.question.underlyingConcept) {
    return `Review "${input.question.underlyingConcept}", then try one easier and one harder variation.`;
  }
  return `Do two more ${input.question.skill.replace(/-/g, " ")} questions at difficulty ${Math.max(1, input.question.difficulty - 1)} before moving up.`;
}

export function buildTutoringReview(input: TutoringReviewInput): TutoringReview {
  const stubQuestion: Question = {
    id: input.questionId ?? "review",
    testType: "sat",
    section: input.question.section,
    skill: input.question.skill,
    subskill: null,
    difficulty: input.question.difficulty,
    questionText: input.question.questionText,
    choices: input.question.choices,
    correctAnswer: input.question.correctAnswer,
    explanation: input.question.explanation,
    conceptExplanation: input.question.conceptExplanation,
    formulaOrRule: input.question.formulaOrRule,
    formulaLatex: null,
    underlyingConcept: input.question.underlyingConcept,
    commonMistakes: input.question.commonMistakes,
    mistakeTypes: input.question.mistakeTypes,
    estimatedTime: input.question.estimatedTime ?? 90,
    passage: null,
    status: "active",
    prompt: input.question.questionText,
    skill_tag: input.question.skill,
    correct_answer: input.question.correctAnswer,
    estimated_seconds: input.question.estimatedTime ?? 90,
    commonMistakeExplanation: input.question.commonMistakeExplanation ?? null,
  };

  const mistakeType =
    input.mistakeType ??
    inferMistakeType(
      stubQuestion,
      input.timeTakenSeconds ?? stubQuestion.estimatedTime,
      false
    ) ??
    "concept_gap";

  const underlyingConcept =
    input.question.underlyingConcept ??
    input.question.conceptExplanation ??
    "Apply the core rule for this skill carefully.";

  const breakdown = buildTutoringBreakdown({
    questionText: input.question.questionText,
    explanation: input.question.explanation,
    correctAnswer: input.question.correctAnswer,
    selectedAnswer: input.selectedAnswer,
    section: input.question.section,
    formulaOrRule: input.question.formulaOrRule,
    underlyingConcept,
    conceptExplanation: input.question.conceptExplanation,
    commonMistakeExplanation: input.question.commonMistakeExplanation,
    commonMistakes: input.question.commonMistakes,
    skill: input.question.skill,
  });

  return {
    whyWrong: breakdown.whyWrong,
    commonMistake: breakdown.commonMistake,
    underlyingConcept: breakdown.conceptSummary,
    formulaOrRule: input.question.formulaOrRule,
    simpleExplanation: breakdown.microSteps.join(" "),
    rememberNextTime: breakdown.rememberNextTime,
    practiceNext: defaultPracticeNext(input, mistakeType),
    mistakeType,
    solutionSteps: breakdown.microSteps,
    workedExample: breakdown.workedExample,
  };
}

export async function enhanceTutoringReviewWithAi(
  input: TutoringReviewInput,
  base: TutoringReview
): Promise<TutoringReview> {
  if (!isAiConfigured()) return base;

  try {
    const raw = await generateTextStrong(
      [
        { role: "system", content: "You are a calm SAT tutor writing for a high school student. Output JSON only." },
        {
          role: "user",
          content: tutoringReviewEnhancementPrompt({
            questionText: input.question.questionText,
            selectedAnswer: input.selectedAnswer,
            correctAnswer: input.question.correctAnswer,
            skill: input.question.skill,
            section: input.question.section,
            underlyingConcept: base.underlyingConcept,
            explanation: input.question.explanation,
            formulaOrRule: input.question.formulaOrRule,
          }),
        },
      ],
      520
    );

    const parsed = JSON.parse(extractJsonObject(raw)) as Partial<TutoringReview> & {
      solutionSteps?: string[];
      workedExample?: string[];
    };
    const aiSteps = Array.isArray(parsed.solutionSteps)
      ? parsed.solutionSteps.map(String).filter(Boolean)
      : null;
    const aiWorked = Array.isArray(parsed.workedExample)
      ? parsed.workedExample.map(String).filter(Boolean)
      : null;

    return {
      ...base,
      whyWrong: parsed.whyWrong?.trim() || base.whyWrong,
      commonMistake: parsed.commonMistake?.trim() || base.commonMistake,
      simpleExplanation: parsed.simpleExplanation?.trim() || base.simpleExplanation,
      rememberNextTime: parsed.rememberNextTime?.trim() || base.rememberNextTime,
      practiceNext: parsed.practiceNext?.trim() || base.practiceNext,
      solutionSteps: aiSteps?.length ? aiSteps : base.solutionSteps,
      workedExample: aiWorked?.length ? aiWorked : base.workedExample,
    };
  } catch {
    return base;
  }
}

export async function buildEnhancedTutoringReview(
  input: TutoringReviewInput,
  options?: { useAi?: boolean; userId?: string }
): Promise<TutoringReview> {
  if (input.questionId) {
    const cached = await getCachedTutoringReview(input.questionId, input.selectedAnswer);
    if (cached) {
      const base = buildTutoringReview(input);
      return { ...base, ...cached, solutionSteps: cached.solutionSteps ?? base.solutionSteps };
    }
  }

  const base = buildTutoringReview(input);

  const shouldEnhanceWithAi =
    options?.useAi === true &&
    isAiConfigured();

  if (!shouldEnhanceWithAi) {
    if (input.questionId) {
      await cacheTutoringReview(input.questionId, input.selectedAnswer, base);
    }
    return base;
  }

  if (options?.userId && input.questionId) {
    const key = rateLimitKey(options.userId, "tutoring_review", input.questionId);
    const { allowed } = checkRateLimit(key);
    if (!allowed) {
      if (input.questionId) await cacheTutoringReview(input.questionId, input.selectedAnswer, base);
      return base;
    }
  }

  const enhanced = await enhanceTutoringReviewWithAi(input, base);

  if (input.questionId) {
    await cacheTutoringReview(input.questionId, input.selectedAnswer, enhanced);
  }

  return enhanced;
}
