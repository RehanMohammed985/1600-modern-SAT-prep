import type { GeneratedQuestionPack } from "./types";
import type { MistakeType } from "@/lib/types";

const MISTAKE_TYPES: MistakeType[] = [
  "careless",
  "concept_gap",
  "timing",
  "misread",
  "vocabulary",
  "setup_error",
];

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean);
}

function asMistakeTypes(value: unknown): MistakeType[] {
  const raw = asStringArray(value);
  const filtered = raw.filter((t): t is MistakeType =>
    MISTAKE_TYPES.includes(t as MistakeType)
  );
  return filtered.length ? filtered : ["concept_gap"];
}

function parseVariation(raw: unknown, fallbackDifficulty: number) {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    questionText: asString(obj.questionText),
    choices: asStringArray(obj.choices),
    correctAnswer: asString(obj.correctAnswer),
    explanation: asString(obj.explanation),
    difficulty: Number(obj.difficulty ?? fallbackDifficulty),
  };
}

export function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

export function parseGeneratedQuestionPack(raw: string): GeneratedQuestionPack | null {
  try {
    const json = JSON.parse(extractJsonObject(raw)) as Record<string, unknown>;
    const passageRaw = json.passage as Record<string, unknown> | undefined;

    const pack: GeneratedQuestionPack = {
      questionText: asString(json.questionText),
      choices: asStringArray(json.choices),
      correctAnswer: asString(json.correctAnswer),
      explanation: asString(json.explanation),
      conceptExplanation: asString(json.conceptExplanation),
      commonMistakeExplanation: asString(json.commonMistakeExplanation),
      underlyingConcept: asString(json.underlyingConcept),
      formulaOrRule: json.formulaOrRule ? asString(json.formulaOrRule) : null,
      formulaLatex: json.formulaLatex ? asString(json.formulaLatex) : null,
      commonMistakes: asStringArray(json.commonMistakes),
      mistakeTypes: asMistakeTypes(json.mistakeTypes),
      estimatedTime: Number(json.estimatedTime ?? 90),
      easierVariation: parseVariation(json.easierVariation, 1),
      harderVariation: parseVariation(json.harderVariation, 3),
    };

    if (passageRaw?.passageText) {
      pack.passage = {
        passageText: asString(passageRaw.passageText),
        topic: asString(passageRaw.topic, "General"),
        tone: asString(passageRaw.tone, "Neutral"),
        readingSkill: asString(passageRaw.readingSkill, "reading-main-idea"),
        estimatedReadSeconds: Number(passageRaw.estimatedReadSeconds ?? 90),
        difficulty: Number(passageRaw.difficulty ?? 2),
      };
    }

    return pack;
  } catch {
    return null;
  }
}
