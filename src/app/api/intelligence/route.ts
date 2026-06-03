import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/env";
import { mapAttemptRow, mapQuestionRow } from "@/lib/question-map";
import { computeSkillIntelligence } from "@/lib/intelligence/skill-score";
import { buildStudentIntelligence } from "@/lib/intelligence/integration";
import { predictScore, daysToTarget, scoreGoalLabel } from "@/lib/intelligence/score-prediction";
import type { Profile } from "@/lib/types";

export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json(null);

    const [{ data: profile }, { data: attempts }, { data: questions }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("attempts").select("*").eq("student_id", user.id).order("created_at", { ascending: false }).limit(500),
      supabase.from("questions").select("*"),
    ]);

    const mappedAttempts = (attempts ?? []).map((a) => mapAttemptRow(a as Record<string, unknown>));
    const allQuestions = (questions ?? []).map(mapQuestionRow);
    const questionsById = new Map(allQuestions.map((q) => [q.id, q]));
    const metrics = computeSkillIntelligence(mappedAttempts, questionsById);

    const profileFields: Pick<Profile, "current_score" | "target_score" | "grade" | "study_minutes_per_day"> | null = profile
      ? {
          current_score: Number((profile as Record<string, unknown>).current_score ?? null) || null,
          target_score: Number((profile as Record<string, unknown>).target_score ?? null) || null,
          grade: (profile as Record<string, unknown>).grade as Profile["grade"] ?? null,
          study_minutes_per_day: Number((profile as Record<string, unknown>).study_minutes_per_day ?? null) || null,
        }
      : null;

    const intelligence = buildStudentIntelligence(mappedAttempts, allQuestions, profileFields);

    const skillStates = metrics.map((m) => ({
      skillTag: m.skill_tag,
      pMastered: m.skillScore,
      pLearn: 0.15, pGuess: 0.15, pSlip: 0.1,
      opportunities: m.attempts,
      consecutiveCorrect: m.correct,
      lastAttemptAt: null,
    }));
    const prediction = predictScore(skillStates, profileFields, metrics);

    const target = (profileFields?.target_score ?? 1200) as number;
    const days = daysToTarget(prediction, target);

    return NextResponse.json({
      intelligence,
      prediction,
      goalLabel: scoreGoalLabel(prediction.current, target, days),
      goalDays: days,
    });
  } catch (error) {
    console.error("GET /api/intelligence", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}


