"use server";

import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/env";
import { isNextRedirect, actionErrorMessage } from "@/lib/safe-action";
import { logServerError } from "@/lib/server-log";
import { generateTextFast, isAiConfigured } from "@/lib/ai/provider";
import {
  getCachedAiContent,
  setCachedAiContent,
  simplerExplanationCacheKey,
} from "@/lib/ai/cache";
import { checkRateLimit, rateLimitKey } from "@/lib/ai/rate-limit";
import { sessionSummaryPrompt, simplerExplanationPrompt } from "@/lib/ai/prompts";
import {
  buildEnhancedTutoringReview,
} from "@/lib/question-factory/tutoring-review";
import type { TutoringReviewInput, TutoringReview } from "@/lib/question-factory/types";
import { generateSimilarQuestion } from "@/lib/question-factory/pipeline";
import { simplifyExplanation } from "@/lib/tutoring";
import type { Question } from "@/lib/types";

export async function fetchSimplerExplanation(input: {
  questionText: string;
  explanation: string;
  skill: string;
  section: string;
  attemptId?: string;
  questionId?: string;
}): Promise<{ text: string; fromAi: boolean }> {
  if (input.attemptId) {
    await trackLearningAction(input.attemptId, { usedSimpler: true });
  }

  const fallback = simplifyExplanation(input.explanation);

  if (input.questionId) {
    const cached = await getCachedAiContent<{ text: string }>(
      simplerExplanationCacheKey(input.questionId),
      "simpler_explanation"
    );
    if (cached?.text) return { text: cached.text, fromAi: false };
  }

  if (!isAiConfigured()) {
    return { text: fallback, fromAi: false };
  }

  try {
    if (hasSupabaseConfig()) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && input.questionId) {
        const key = rateLimitKey(user.id, "simpler_explanation", input.questionId);
        const { allowed } = checkRateLimit(key);
        if (!allowed) return { text: fallback, fromAi: false };
      }
    }

    const text = await generateTextFast([
      {
        role: "system",
        content: "You help high school students prepare for the SAT. Be clear and kind.",
      },
      {
        role: "user",
        content: simplerExplanationPrompt(input),
      },
    ]);
    const result = text || fallback;
    if (input.questionId) {
      await setCachedAiContent(
        simplerExplanationCacheKey(input.questionId),
        "simpler_explanation",
        { text: result }
      );
    }
    return { text: result, fromAi: true };
  } catch {
    return { text: fallback, fromAi: false };
  }
}

export async function fetchTutoringReviewForAttempt(
  input: TutoringReviewInput
): Promise<TutoringReview> {
  try {
    if (!hasSupabaseConfig()) {
      return buildEnhancedTutoringReview(input, { useAi: false });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return buildEnhancedTutoringReview(input, {
      useAi: !!user,
      userId: user?.id,
    });
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    logServerError("fetchTutoringReviewForAttempt", error);
    return buildEnhancedTutoringReview(input, { useAi: false });
  }
}

export async function trackLearningAction(
  attemptId: string,
  patch: {
    usedSimpler?: boolean;
    viewedFormula?: boolean;
    requestedSimilar?: boolean;
    understood?: boolean;
    reviewLater?: boolean;
  }
): Promise<{ error?: string }> {
  if (!hasSupabaseConfig()) return { error: "App not configured." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Please sign in." };

    const updates: Record<string, unknown> = {};
    if (patch.usedSimpler) updates.used_simpler_explanation = true;
    if (patch.viewedFormula) updates.viewed_formula = true;
    if (patch.requestedSimilar) updates.requested_similar = true;
    if (patch.understood !== undefined) updates.understood_explanation = patch.understood;
    if (patch.reviewLater !== undefined) updates.review_later = patch.reviewLater;

    if (!Object.keys(updates).length) return {};

    const { error } = await supabase
      .from("attempts")
      .update(updates)
      .eq("id", attemptId)
      .eq("student_id", user.id);

    return error ? { error: error.message } : {};
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return { error: "Could not save learning action." };
  }
}

export async function findSimilarQuestionId(
  currentQuestionId: string,
  skill: string,
  difficulty = 2
): Promise<{ questionId: string | null; message: string; generated?: boolean }> {
  if (!hasSupabaseConfig()) {
    return { questionId: null, message: "App not configured." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { questionId: null, message: "Please sign in." };

    return generateSimilarQuestion(skill, difficulty, currentQuestionId);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return { questionId: null, message: "Could not generate similar question." };
  }
}

export async function generateSessionSummaryAi(input: {
  focusSkill: string;
  weakSkills: string[];
  mistakeSnippets: string[];
}): Promise<string[]> {
  const fallback = [
    `Keep working on ${input.focusSkill.replace(/-/g, " ")}.`,
    "Review misses while they are still fresh.",
    "Start your next session within 24 hours if you can.",
  ];

  if (!isAiConfigured()) return fallback;

  try {
    const text = await generateTextFast([
      { role: "system", content: "Return exactly 3 bullet lines, each starting with -" },
      {
        role: "user",
        content: sessionSummaryPrompt({
          focusSkill: input.focusSkill,
          weakSkills: input.weakSkills,
          mistakes: input.mistakeSnippets,
        }),
      },
    ]);
    const bullets = text
      .split("\n")
      .map((l) => l.replace(/^[-*•]\s*/, "").trim())
      .filter(Boolean);
    return bullets.length >= 2 ? bullets.slice(0, 3) : fallback;
  } catch {
    return fallback;
  }
}

export async function generateSimilarQuestionAi(
  question: Pick<Question, "questionText" | "skill" | "section" | "difficulty" | "id">
): Promise<{ ok: boolean; preview?: string; questionId?: string }> {
  try {
    const result = await generateSimilarQuestion(
      question.skill,
      question.difficulty,
      question.id ?? "00000000-0000-0000-0000-000000000000"
    );

    if (!result.questionId) return { ok: false };

    if (!hasSupabaseConfig()) return { ok: true, questionId: result.questionId };

    const supabase = await createClient();
    const { data } = await supabase
      .from("questions")
      .select("question_text")
      .eq("id", result.questionId)
      .maybeSingle();

    return {
      ok: true,
      preview: data?.question_text ? String(data.question_text) : undefined,
      questionId: result.questionId,
    };
  } catch {
    return { ok: false };
  }
}
