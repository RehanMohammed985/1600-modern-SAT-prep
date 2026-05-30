import { generateText, isAiConfigured } from "@/lib/ai/provider";
import type { QuestionBlueprint } from "./blueprint";
import { parseGeneratedQuestionPack } from "./parser";
import { questionFactorySystemPrompt, questionFactoryUserPrompt } from "./prompts";
import type { GeneratedQuestionPack } from "./types";

export async function generateQuestionPack(
  blueprint: QuestionBlueprint
): Promise<{ pack: GeneratedQuestionPack | null; raw?: string; error?: string }> {
  if (!isAiConfigured()) {
    return { pack: null, error: "AI not configured. Add OPENROUTER_API_KEY or GEMINI_API_KEY." };
  }

  try {
    const raw = await generateText(
      [
        { role: "system", content: questionFactorySystemPrompt() },
        { role: "user", content: questionFactoryUserPrompt(blueprint) },
      ],
      2200
    );

    const pack = parseGeneratedQuestionPack(raw);
    if (!pack) {
      return { pack: null, raw, error: "Could not parse AI response as a valid question pack." };
    }

    return { pack, raw };
  } catch (err) {
    return {
      pack: null,
      error: err instanceof Error ? err.message : "Question generation failed.",
    };
  }
}
