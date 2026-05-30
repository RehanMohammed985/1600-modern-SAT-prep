"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/env";
import { prepareSessionBank } from "@/lib/reading-bank";
import { buildQuestionHistory, collectSessionQuestionIds } from "@/lib/question-history";
import { pickArenaFollowUps } from "@/lib/mistake-arena";
import { mapAttemptRow, mapQuestionRow } from "@/lib/question-map";
import { normalizePhasePlan } from "@/lib/session-builder";
import { actionErrorMessage } from "@/lib/safe-action";
import { logServerError } from "@/lib/server-log";
import type { Question } from "@/lib/types";

export type MistakeArenaData = {
  followUpQuestions: Question[];
  generated: boolean;
  error?: string;
};

/** Bank-only follow-ups — same concept, slightly harder, no AI. */
export async function prepareMistakeArena(input: {
  sessionId: string;
  sourceQuestionId: string;
  reservedQuestionIds?: string[];
}): Promise<MistakeArenaData> {
  try {
    if (!hasSupabaseConfig()) {
      return { followUpQuestions: [], generated: false, error: "App not configured." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { followUpQuestions: [], generated: false, error: "Please sign in." };

    const [{ data: session }, { data: bankRows }, { data: attempts }] = await Promise.all([
      supabase
        .from("study_sessions")
        .select("phase_plan")
        .eq("id", input.sessionId)
        .eq("student_id", user.id)
        .maybeSingle(),
      supabase.from("questions").select("*"),
      supabase
        .from("attempts")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })
        .limit(120),
    ]);

    const bank = prepareSessionBank(
      (bankRows ?? []).map((r) => mapQuestionRow(r as Record<string, unknown>))
    );
    const source = bank.find((q) => q.id === input.sourceQuestionId);
    if (!source) return { followUpQuestions: [], generated: false };

    const phasePlan = normalizePhasePlan((session?.phase_plan ?? {}) as Record<string, unknown>);
    const reservedIds = collectSessionQuestionIds(phasePlan);
    reservedIds.add(source.id);
    for (const id of input.reservedQuestionIds ?? []) reservedIds.add(id);

    const history = buildQuestionHistory(
      (attempts ?? []).map((a) => mapAttemptRow(a as Record<string, unknown>)),
      { sessionId: input.sessionId }
    );

    const followUps = pickArenaFollowUps(bank, source, reservedIds, history);

    return { followUpQuestions: followUps, generated: false };
  } catch (error) {
    logServerError("prepareMistakeArena", error, {
      sessionId: input.sessionId,
      sourceQuestionId: input.sourceQuestionId,
    });
    return {
      followUpQuestions: [],
      generated: false,
      error: actionErrorMessage(error, "Could not load practice questions."),
    };
  }
}

export async function completeMistakeArena(input: {
  parentAttemptId: string;
  recovered: boolean;
  followUpCorrect: number;
  followUpTotal: number;
}): Promise<{ error?: string }> {
  try {
    if (!hasSupabaseConfig()) return { error: "App not configured." };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Please sign in." };

    const fullPatch = {
      arena_completed: true,
      mistake_recovered: input.recovered,
      review_later: !input.recovered,
      understood_explanation: input.recovered,
    };

    let { error } = await supabase
      .from("attempts")
      .update(fullPatch)
      .eq("id", input.parentAttemptId)
      .eq("student_id", user.id);

    if (error?.message.includes("column") && error.message.includes("does not exist")) {
      ({ error } = await supabase
        .from("attempts")
        .update({
          review_later: !input.recovered,
          understood_explanation: input.recovered,
        })
        .eq("id", input.parentAttemptId)
        .eq("student_id", user.id));
    }

    if (error) return { error: error.message };

    revalidatePath("/session");
    revalidatePath("/dashboard");
    return {};
  } catch (error) {
    logServerError("completeMistakeArena", error, { parentAttemptId: input.parentAttemptId });
    return { error: actionErrorMessage(error, "Could not save mistake review.") };
  }
}
