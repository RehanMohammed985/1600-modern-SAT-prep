import type { MistakeType, Question } from "@/lib/types";
import type { QuestionBlueprint } from "./blueprint";

export type QuestionVariationType = "base" | "easier" | "harder";

export type GeneratedVariation = {
  questionText: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: number;
};

export type GeneratedQuestionPack = {
  questionText: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
  conceptExplanation: string;
  commonMistakeExplanation: string;
  underlyingConcept: string;
  formulaOrRule: string | null;
  formulaLatex: string | null;
  commonMistakes: string[];
  mistakeTypes: MistakeType[];
  estimatedTime: number;
  easierVariation: GeneratedVariation;
  harderVariation: GeneratedVariation;
  passage?: {
    passageText: string;
    topic: string;
    tone: string;
    readingSkill: string;
    estimatedReadSeconds: number;
    difficulty: number;
  };
};

export type ValidationIssue = {
  code:
    | "missing_correct_in_choices"
    | "too_few_choices"
    | "duplicate_content"
    | "weak_explanation"
    | "difficulty_mismatch"
    | "invalid_variation"
    | "missing_fields";
  message: string;
  severity: "error" | "warning";
};

export type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
  contentHash: string;
};

export type StoredQuestionPack = {
  baseQuestionId: string;
  easierQuestionId: string;
  harderQuestionId: string;
  blueprintHash: string;
  reused: boolean;
};

export type FactoryPipelineResult =
  | { ok: true; pack: StoredQuestionPack; question: Question }
  | { ok: false; error: string; validationIssues?: ValidationIssue[] };

export type TutoringReview = {
  whyWrong: string;
  commonMistake: string;
  underlyingConcept: string;
  formulaOrRule: string | null;
  simpleExplanation: string;
  rememberNextTime: string;
  practiceNext: string;
  mistakeType: MistakeType;
  solutionSteps: string[];
  workedExample: string[];
  passageEvidence?: { text: string } | null;
};

export type TutoringReviewInput = {
  question: Pick<
    Question,
    | "questionText"
    | "choices"
    | "correctAnswer"
    | "explanation"
    | "conceptExplanation"
    | "formulaOrRule"
    | "underlyingConcept"
    | "commonMistakes"
    | "skill"
    | "section"
    | "difficulty"
    | "mistakeTypes"
    | "estimatedTime"
    | "commonMistakeExplanation"
  > & { passageText?: string | null };
  selectedAnswer: string;
  mistakeType?: MistakeType | null;
  timeTakenSeconds?: number;
  estimatedTime?: number;
  questionId?: string;
};

export type BlueprintGenerationRequest = {
  blueprint: QuestionBlueprint;
  forceRegenerate?: boolean;
};
