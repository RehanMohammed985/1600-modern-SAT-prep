import { createClient } from "@/lib/supabase/server";
import type { TutoringReview } from "@/lib/question-factory/types";

export type AiCacheContentType = "tutoring_review" | "simpler_explanation" | "follow_up_questions";

function normalizeKeyPart(value: string): string {
  return value.trim().toLowerCase().slice(0, 120);
}

export function tutoringReviewCacheKey(questionId: string, selectedAnswer: string): string {
  return `tutoring_review:${questionId}:${normalizeKeyPart(selectedAnswer)}`;
}

export function simplerExplanationCacheKey(questionId: string): string {
  return `simpler_explanation:${questionId}`;
}

export async function getCachedAiContent<T>(
  cacheKey: string,
  contentType: AiCacheContentType
): Promise<T | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_content_cache")
      .select("content")
      .eq("cache_key", cacheKey)
      .eq("content_type", contentType)
      .maybeSingle();

    if (error || !data?.content) return null;
    return data.content as T;
  } catch {
    return null;
  }
}

export async function setCachedAiContent(
  cacheKey: string,
  contentType: AiCacheContentType,
  content: unknown
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("ai_content_cache").upsert(
      {
        cache_key: cacheKey,
        content_type: contentType,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cache_key" }
    );
  } catch {
    // Cache write failure should not block the user flow
  }
}

export async function getCachedTutoringReview(
  questionId: string,
  selectedAnswer: string
): Promise<TutoringReview | null> {
  return getCachedAiContent<TutoringReview>(
    tutoringReviewCacheKey(questionId, selectedAnswer),
    "tutoring_review"
  );
}

export async function cacheTutoringReview(
  questionId: string,
  selectedAnswer: string,
  review: TutoringReview
): Promise<void> {
  await setCachedAiContent(
    tutoringReviewCacheKey(questionId, selectedAnswer),
    "tutoring_review",
    review
  );
}
