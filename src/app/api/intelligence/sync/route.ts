import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/env";
import { mapAttemptRow, mapQuestionRow } from "@/lib/question-map";
import { buildSkillStateFromAttempts } from "@/lib/intelligence/knowledge-tracing";
import { predictScore } from "@/lib/intelligence/score-prediction";
import { computeSkillIntelligence } from "@/lib/intelligence/skill-score";

export async function POST() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [{ data: profile }, { data: attempts }, { data: questions }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("attempts").select("*").eq("student_id", user.id).order("created_at", { ascending: false }).limit(500),
      supabase.from("questions").select("*"),
    ]);

    if (!attempts || attempts.length === 0) {
      return NextResponse.json({ synced: true, skillCount: 0 });
    }

    const mappedAttempts = attempts.map((a) => mapAttemptRow(a as Record<string, unknown>));
    const allQuestions = (questions ?? []).map(mapQuestionRow);
    const questionsById = new Map(allQuestions.map((q) => [q.id, q]));

    const bySkill = new Map<string, unknown[]>();
    for (const a of mappedAttempts) {
      const q = questionsById.get(a.question_id);
      const skill = q?.skill ?? q?.skill_tag ?? "general";
      const list = bySkill.get(skill) ?? [];
      list.push(a);
      bySkill.set(skill, list);
    }

    const { data: existingCards } = await supabase
      .from("review_cards")
      .select("skill_tag")
      .eq("student_id", user.id);

    const existingSkills = new Set((existingCards ?? []).map((c: Record<string, unknown>) => String(c.skill_tag)));
    const now = new Date().toISOString();

    const upsertCards = [];
    for (const [skillTag, skillAttempts] of bySkill) {
      if (existingSkills.has(skillTag)) continue;
      const last = skillAttempts[skillAttempts.length - 1] as Record<string, unknown>;
      upsertCards.push({
        student_id: user.id,
        skill_tag: skillTag,
        ease_factor: 2.5,
        interval_days: 1,
        repetitions: 0,
        next_review_at: new Date(Date.now() + 86400000).toISOString(),
        last_attempt_at: last.created_at ? String(last.created_at) : now,
      });
    }

    if (upsertCards.length > 0) {
      const { error: cardError } = await supabase.from("review_cards").upsert(upsertCards, {
        onConflict: "student_id,skill_tag",
        ignoreDuplicates: true,
      });
      if (cardError) console.error("Sync cards error:", cardError);
    }

    const skillMetrics = computeSkillIntelligence(mappedAttempts, questionsById);
    const profileFields = profile
      ? {
          current_score: Number((profile as Record<string, unknown>).current_score ?? null) || null,
          target_score: Number((profile as Record<string, unknown>).target_score ?? null) || null,
        }
      : null;

    const prediction = predictScore(
      Array.from(bySkill.entries()).map(([skillTag, skillAttempts]) => {
        const { state } = buildSkillStateFromAttempts(skillTag, skillAttempts as any);
        return state;
      }),
      profileFields,
      skillMetrics
    );

    const { error: predError } = await supabase.from("score_predictions").insert({
      student_id: user.id,
      predicted_total: prediction.current,
      predicted_math: prediction.breakdown.math,
      predicted_rw: prediction.breakdown.readingWriting,
      predicted_projected: prediction.projected,
      confidence: prediction.confidence,
    });
    if (predError) console.error("Sync prediction error:", predError);

    return NextResponse.json({ synced: true, skillCount: bySkill.size });
  } catch (error) {
    console.error("POST /api/intelligence/sync", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
