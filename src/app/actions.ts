"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ONBOARDED_COOKIE } from "@/lib/auth-cookies";
import { enrichQuestionBank, prepareSessionBank, repairReadingInPhasePlan, resolveSessionQuestions } from "@/lib/reading-bank";
import { buildAdaptiveSessionPlan } from "@/lib/intelligence/adaptive";
import { computeSkillIntelligence } from "@/lib/intelligence/skill-score";
import { buildQuestionHistory } from "@/lib/question-history";
import { gradeRigorFromProfile } from "@/lib/grade-rigor";
import {
  buildSkillStats,
  estimateProgress,
  getConceptGaps,
  getImprovingSkillsIntelligent,
  getNextStudyRecommendationIntelligent,
  getReviewRecommendations,
  getWeakAreasIntelligent,
  gradePathProgress,
  hasTimingIssues,
  recommendedSessionLabel,
} from "@/lib/recommendations";
import { mapAttemptRow, mapQuestionRow } from "@/lib/question-map";
import {
  filterUuidIds,
  phasePlanHasInvalidIds,
  repairPhasePlan,
} from "@/lib/phase-plan-repair";
import { getWrongQuestionIdsFromSession, normalizePhasePlan } from "@/lib/session-builder";
import { focusSkillLabel, studyModeFromProfile } from "@/lib/session-schedule";
import { inferMistakeType } from "@/lib/tutoring";
import { nextStudyForProfile, parseOnboardingForm } from "@/lib/student-path";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/env";
import { actionErrorMessage, isNextRedirect, rethrowFrameworkError } from "@/lib/safe-action";
import { logServerError } from "@/lib/server-log";
import { isDatabaseQuestionId } from "@/lib/utils";
import type {
  ConfidenceLevel,
  MistakeType,
  Profile,
  PhasePlan,
  Question,
  SessionPhase,
} from "@/lib/types";

const mapQuestion = mapQuestionRow;

function mapProfileRow(row: Record<string, unknown>): Profile {
  const signup = row.test_signup_status as Profile["test_signup_status"];
  return {
    id: String(row.id),
    email: row.email ? String(row.email) : null,
    grade: (row.grade as Profile["grade"]) ?? null,
    current_score: row.current_score != null ? Number(row.current_score) : null,
    target_score: row.target_score != null ? Number(row.target_score) : null,
    test_date: row.test_date ? String(row.test_date) : null,
    planned_test_date: row.planned_test_date ? String(row.planned_test_date) : null,
    study_minutes_per_day:
      row.study_minutes_per_day != null ? Number(row.study_minutes_per_day) : null,
    onboarding_completed: Boolean(row.onboarding_completed),
    sat_experience: (row.sat_experience as Profile["sat_experience"]) ?? null,
    test_track: (row.test_track as Profile["test_track"]) ?? null,
    registered_for_test:
      row.registered_for_test != null
        ? Boolean(row.registered_for_test)
        : signup === "signed_up",
    test_signup_status: signup ?? null,
    test_timeline: (row.test_timeline as Profile["test_timeline"]) ?? null,
    study_plan_label: row.study_plan_label ? String(row.study_plan_label) : null,
    grade_path_label: row.grade_path_label ? String(row.grade_path_label) : null,
    beginner_path: Boolean(row.beginner_path ?? row.sat_experience === "never"),
    comfort_level: (row.comfort_level as Profile["comfort_level"]) ?? null,
    parent_email: row.parent_email ? String(row.parent_email) : null,
    slow_mode: Boolean(row.slow_mode ?? row.beginner_path),
  };
}

export type QuestionReviewMeta = {
  correctAnswer: string;
  explanation: string;
  conceptExplanation?: string | null;
  formulaOrRule?: string | null;
  underlyingConcept?: string | null;
  commonMistakes?: string[];
  section?: "math" | "reading";
  skill?: string;
  estimatedTime?: number;
  mistakeTypes?: MistakeType[];
};

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const jar = await cookies();
  jar.delete(ONBOARDED_COOKIE);
  redirect("/login");
}

export async function saveOnboarding(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  try {
    const parsed = parseOnboardingForm(formData);
    if ("error" in parsed) return { error: parsed.error };

    if (!hasSupabaseConfig()) {
      return { error: "Database not configured. Add Supabase keys to .env.local." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Please sign in to save onboarding." };

    const row = {
      id: user.id,
      email: user.email ?? null,
      ...parsed.data,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("profiles").upsert(row, { onConflict: "id" });

    if (error) {
      const msg = error.message;
      logServerError("saveOnboarding.upsert", error, { userId: user.id });
      if (msg.includes("permission denied")) {
        return {
          error:
            "Could not save your profile. Run supabase/fix_permissions.sql in the Supabase SQL editor, then try again.",
        };
      }
      if (msg.includes("column") && msg.includes("does not exist")) {
        return {
          error:
            "Your database is missing onboarding columns. Run supabase/migrations/20250525000000_onboarding_student_path.sql in the Supabase SQL editor, then try again.",
        };
      }
      return { error: msg };
    }

    const jar = await cookies();
    jar.set(ONBOARDED_COOKIE, "1", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });

    revalidatePath("/dashboard");
    revalidatePath("/onboarding");
    return { success: true };
  } catch (error) {
    rethrowFrameworkError(error);
    logServerError("saveOnboarding", error);
    return { error: actionErrorMessage(error, "Could not save onboarding.") };
  }
}

export async function startSession(): Promise<{ sessionId?: string; error?: string }> {
  try {
    if (!hasSupabaseConfig()) {
      return {
        error: "Database not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
      };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Please sign in to start a session." };

    const { data: questions, error: questionsError } = await supabase.from("questions").select("*");
    if (questionsError) return { error: questionsError.message };

    const allQuestions = prepareSessionBank((questions ?? []).map(mapQuestion));
    if (allQuestions.length === 0) {
      return {
        error: "No practice questions found. Run supabase/seed.sql in your Supabase project.",
      };
    }

    const [{ data: profile }, { data: attempts }, { data: sessions }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("attempts")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("study_sessions")
        .select("status")
        .eq("student_id", user.id)
        .eq("status", "completed"),
    ]);

    const questionsById = new Map(allQuestions.map((q) => [q.id, q]));
    const mappedProfile = profile ? mapProfileRow(profile as Record<string, unknown>) : null;
    const mappedAttempts = (attempts ?? []).map((a) => mapAttemptRow(a as Record<string, unknown>));
    const sessionsCompleted = (sessions ?? []).length;
    const metrics = computeSkillIntelligence(mappedAttempts, questionsById);
    const gradeRigor = gradeRigorFromProfile(
      mappedProfile,
      mappedAttempts,
      sessionsCompleted,
      metrics
    );
    const wrongIds = mappedAttempts
      .filter((a) => !a.is_correct)
      .slice(0, 25)
      .map((a) => a.question_id);
    const timingIssues = metrics.some((m) => m.hasTimingIssue);
    const history = buildQuestionHistory(mappedAttempts);

    const { plan: phasePlan } = buildAdaptiveSessionPlan(
      allQuestions,
      metrics,
      wrongIds,
      {
        slowMode: mappedProfile?.slow_mode,
        timingIssues,
        studyMinutes: mappedProfile?.study_minutes_per_day,
        history,
        gradeRigor,
      }
    );

    const { data: session, error } = await supabase
      .from("study_sessions")
      .insert({
        student_id: user.id,
        status: "in_progress",
        current_phase: "warmup",
        phase_plan: phasePlan,
      })
      .select("id")
      .single();

    if (error || !session) {
      return { error: error?.message ?? "Could not start session. Try again." };
    }

    revalidatePath("/dashboard");
    return { sessionId: String(session.id) };
  } catch (error) {
    rethrowFrameworkError(error);
    logServerError("startSession", error);
    return { error: actionErrorMessage(error, "Could not start session.") };
  }
}

export type SubmitAttemptResult = {
  isCorrect: boolean;
  selectedAnswer: string;
  correctAnswer: string;
  explanation: string;
  conceptExplanation: string | null;
  formulaOrRule: string | null;
  underlyingConcept: string | null;
  commonMistakes: string[];
  mistakeType: MistakeType | null;
  whatToDoNext: string;
  attemptId?: string;
  error?: string;
};

export async function submitAttempt(
  sessionId: string,
  questionId: string,
  answer: string,
  timeTakenSeconds: number,
  questionMeta?: QuestionReviewMeta,
  confidence?: ConfidenceLevel | null
): Promise<SubmitAttemptResult> {
  const emptyResult = (error: string): SubmitAttemptResult => ({
    isCorrect: false,
    selectedAnswer: answer,
    correctAnswer: "",
    explanation: "",
    conceptExplanation: null,
    formulaOrRule: null,
    underlyingConcept: null,
    commonMistakes: [],
    mistakeType: null,
    whatToDoNext: "",
    error,
  });

  try {
    if (!hasSupabaseConfig()) {
      return emptyResult("Database not configured. Add Supabase keys to .env.local.");
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return emptyResult("Please sign in to save your answer.");

    let correctAnswer = questionMeta?.correctAnswer?.trim() ?? "";
  let explanation = questionMeta?.explanation?.trim() ?? "";
  let conceptExplanation = questionMeta?.conceptExplanation ?? null;
  let formulaOrRule = questionMeta?.formulaOrRule ?? null;
  let underlyingConcept = questionMeta?.underlyingConcept ?? null;
  let commonMistakes = questionMeta?.commonMistakes ?? [];
  const estimatedTime = questionMeta?.estimatedTime ?? 90;
  const mistakeTypes = questionMeta?.mistakeTypes ?? ["concept_gap"];

  if (isDatabaseQuestionId(questionId)) {
    const { data: row } = await supabase.from("questions").select("*").eq("id", questionId).maybeSingle();
    if (row) {
      const q = mapQuestion(row as Record<string, unknown>);
      correctAnswer = q.correctAnswer;
      explanation = q.explanation;
      conceptExplanation = q.conceptExplanation;
      formulaOrRule = q.formulaOrRule;
      underlyingConcept = q.underlyingConcept;
      commonMistakes = q.commonMistakes;
    }
  }

  if (!correctAnswer) {
    return {
      isCorrect: false,
      selectedAnswer: answer,
      correctAnswer: "",
      explanation: "",
      conceptExplanation: null,
      formulaOrRule: null,
      underlyingConcept: null,
      commonMistakes: [],
      mistakeType: null,
      whatToDoNext: "",
      error: "Could not grade this question. Start a new session from your dashboard.",
    };
  }

  const isCorrect =
    correctAnswer.trim().toLowerCase() === answer.trim().toLowerCase();

  const stubQuestion: Question = {
    id: questionId,
    testType: "sat",
    section: questionMeta?.section ?? "math",
    skill: questionMeta?.skill ?? "general",
    subskill: null,
    difficulty: 2,
    questionText: "",
    choices: [],
    correctAnswer,
    explanation,
    conceptExplanation,
    formulaOrRule,
    formulaLatex: questionMeta?.formulaOrRule ?? null,
    underlyingConcept,
    commonMistakes,
    mistakeTypes,
    estimatedTime,
    passage: null,
    status: "active",
    prompt: "",
    skill_tag: questionMeta?.skill ?? "general",
    correct_answer: correctAnswer,
    estimated_seconds: estimatedTime,
  };

  const mistakeType = inferMistakeType(stubQuestion, timeTakenSeconds, isCorrect);
  const whatToDoNext = isCorrect
    ? "Keep going — same careful pace on the next one."
    : mistakeType === "timing"
      ? "Next time, jot the key info first, then solve."
      : mistakeType === "vocabulary"
        ? "Underline the word the question is really asking about."
        : underlyingConcept
          ? `Review: ${underlyingConcept}`
          : "Read the explanation, then try a similar question in your next session.";

  const base = {
    isCorrect,
    selectedAnswer: answer,
    correctAnswer,
    explanation,
    conceptExplanation,
    formulaOrRule,
    underlyingConcept,
    commonMistakes,
    mistakeType,
    whatToDoNext,
  };

  if (!isDatabaseQuestionId(questionId)) {
    return base;
  }

  const { count: priorCount } = await supabase
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("student_id", user.id)
    .eq("question_id", questionId);

  const { data: inserted, error } = await supabase
    .from("attempts")
    .insert({
      student_id: user.id,
      question_id: questionId,
      session_id: sessionId,
      answer,
      is_correct: isCorrect,
      time_taken_seconds: Math.max(0, Math.round(timeTakenSeconds)),
      confidence: confidence ?? null,
      mistake_type: mistakeType,
      retry_index: priorCount ?? 0,
    })
    .select("id")
    .single();

  if (error) {
    const permissionHint = error.message.includes("permission denied")
      ? " Run supabase/complete_setup.sql in Supabase to save progress."
      : "";
    return { ...base, error: `Answer checked, but could not save.${permissionHint}` };
  }

  revalidatePath("/session");
  revalidatePath("/dashboard");
  return { ...base, attemptId: inserted?.id ? String(inserted.id) : undefined };
  } catch (error) {
    rethrowFrameworkError(error);
    logServerError("submitAttempt", error, { sessionId, questionId });
    return emptyResult(actionErrorMessage(error, "Could not submit your answer."));
  }
}

export async function updateAttemptReview(
  attemptId: string,
  patch: {
    understood?: boolean;
    reviewLater?: boolean;
    mistakeType?: MistakeType;
  }
): Promise<{ error?: string }> {
  try {
    if (!hasSupabaseConfig()) return { error: "Database not configured." };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Please sign in." };

    const updates: Record<string, unknown> = {};
    if (patch.understood !== undefined) updates.understood_explanation = patch.understood;
    if (patch.reviewLater !== undefined) updates.review_later = patch.reviewLater;
    if (patch.mistakeType) updates.mistake_type = patch.mistakeType;

    const { error } = await supabase
      .from("attempts")
      .update(updates)
      .eq("id", attemptId)
      .eq("student_id", user.id);

    if (error) return { error: error.message };
    revalidatePath("/dashboard");
    return {};
  } catch (error) {
    rethrowFrameworkError(error);
    logServerError("updateAttemptReview", error, { attemptId });
    return { error: actionErrorMessage(error, "Could not update review.") };
  }
}

export async function advanceSessionPhase(
  sessionId: string
): Promise<{ nextPhase: SessionPhase; error?: string }> {
  const phaseOrder = ["warmup", "focus", "mixed", "timed", "mistakes", "takeaway", "complete"] as const;

  try {
    if (!hasSupabaseConfig()) {
      return { nextPhase: "warmup", error: "Database not configured." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { nextPhase: "warmup", error: "Please sign in." };

    const { data: session } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("student_id", user.id)
      .single();

    if (!session) return { nextPhase: "complete", error: "Session not found" };

    let rawPhase = session.current_phase === "review" ? "mistakes" : session.current_phase;
    const currentIdx = phaseOrder.indexOf(rawPhase as (typeof phaseOrder)[number]);
    let nextPhase = phaseOrder[Math.min(Math.max(currentIdx, 0) + 1, phaseOrder.length - 1)];

    const phasePlan = normalizePhasePlan(
      (session.phase_plan ?? {}) as Record<string, unknown>
    );

    if (nextPhase === "mistakes") {
      const { data: attempts } = await supabase
        .from("attempts")
        .select("*")
        .eq("session_id", sessionId)
        .eq("student_id", user.id);
      const mapped = (attempts ?? []).map((a) => mapAttemptRow(a as Record<string, unknown>));
      const wrongIds = getWrongQuestionIdsFromSession(mapped, phasePlan);
      phasePlan.mistakes =
        wrongIds.length > 0 ? wrongIds : phasePlan.mistakes.length ? phasePlan.mistakes : phasePlan.focus.slice(0, 2);
    }

    const updates: Record<string, unknown> = {
      current_phase: nextPhase,
      phase_plan: phasePlan,
    };
    if (nextPhase === "complete") {
      updates.status = "completed";
      updates.completed_at = new Date().toISOString();
    }

    const { error } = await supabase.from("study_sessions").update(updates).eq("id", sessionId);

    if (error) return { nextPhase: rawPhase as SessionPhase, error: error.message };

    revalidatePath("/session");
    revalidatePath("/dashboard");

    return { nextPhase: nextPhase as SessionPhase };
  } catch (error) {
    rethrowFrameworkError(error);
    logServerError("advanceSessionPhase", error, { sessionId });
    return {
      nextPhase: "warmup",
      error: actionErrorMessage(error, "Could not advance session."),
    };
  }
}

export async function getDashboardData(): Promise<{
  error?: string;
  profile: Profile | null;
  weakAreas: { skill_tag: string; accuracy: number; attempts: number; skillScore?: number }[];
  improvingSkills: { skill_tag: string; accuracy: number; attempts: number; skillScore?: number }[];
  skillInsights: {
    skill_tag: string;
    attempts: number;
    accuracy: number;
    skillScore: number;
    hasTimingIssue: boolean;
    hasConceptGap: boolean;
    recoveredMistakes: number;
    retryRate: number;
  }[];
  conceptGaps: { skill_tag: string; label: string; skillScore: number }[];
  reviewRecommendations: Awaited<ReturnType<typeof getReviewRecommendations>>;
  timingIssues: boolean;
  recentMistakes: {
    questionId: string;
    skill: string;
    mistakeType: MistakeType | null;
    answeredAt: string;
    reviewLater: boolean;
    recovered: boolean;
  }[];
  recentSessions: {
    id: string;
    status: string;
    current_phase: SessionPhase;
    started_at: string;
    completed_at: string | null;
  }[];
  streak: number;
  estimatedProgress: number;
  gradePathProgress: number;
  recommendedSessionLabel: string;
  nextStudy: string;
  learningPhaseLabel: string | null;
} | null> {
  try {
    if (!hasSupabaseConfig()) {
      return {
        error: "Database not configured. Add Supabase keys to .env.local.",
        profile: null,
        weakAreas: [],
        improvingSkills: [],
        skillInsights: [],
        conceptGaps: [],
        reviewRecommendations: [],
        timingIssues: false,
        recentMistakes: [],
        recentSessions: [],
        streak: 0,
        estimatedProgress: 0,
        gradePathProgress: 0,
        recommendedSessionLabel: "Guided study session",
        nextStudy: "Set up Supabase to begin studying.",
        learningPhaseLabel: null,
      };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const [{ data: profile }, { data: sessions }, { data: attempts }, { data: questions }] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase
          .from("study_sessions")
          .select("*")
          .eq("student_id", user.id)
          .order("started_at", { ascending: false })
          .limit(8),
        supabase
          .from("attempts")
          .select("*")
          .eq("student_id", user.id)
          .order("created_at", { ascending: false })
          .limit(300),
        supabase.from("questions").select("*"),
      ]);

    const allQuestions = (questions ?? []).map(mapQuestion);
    const questionsById = new Map(allQuestions.map((q) => [q.id, q]));

    const mappedAttempts = (attempts ?? []).map((a) => mapAttemptRow(a as Record<string, unknown>));
    const metrics = computeSkillIntelligence(mappedAttempts, questionsById);
    const stats = buildSkillStats(mappedAttempts, questionsById);
    const { calculateStreak } = await import("@/lib/recommendations");
    const mappedProfile = profile ? mapProfileRow(profile as Record<string, unknown>) : null;
    const timingIssues = hasTimingIssues(mappedAttempts, questionsById);
    const sessionsCompleted = (sessions ?? []).filter((s) => s.status === "completed").length;
    const rigor = gradeRigorFromProfile(
      mappedProfile,
      mappedAttempts,
      sessionsCompleted,
      metrics
    );

    const recentMistakes = mappedAttempts
      .filter((a) => !a.is_correct)
      .slice(0, 6)
      .map((a) => {
        const q = questionsById.get(a.question_id);
        return {
          questionId: a.question_id,
          skill: q?.skill ?? q?.skill_tag ?? "practice",
          mistakeType: a.mistake_type,
          answeredAt: a.created_at,
          reviewLater: a.review_later,
          recovered: a.mistake_recovered,
        };
      });

    const mappedSessions = (sessions ?? []).map((s) => ({
      id: String(s.id),
      student_id: String(s.student_id),
      status: s.status as "in_progress" | "completed",
      current_phase: (s.current_phase === "review" ? "mistakes" : s.current_phase) as SessionPhase,
      phase_plan: normalizePhasePlan((s.phase_plan ?? {}) as Record<string, unknown>),
      started_at: String(s.started_at),
      completed_at: s.completed_at ? String(s.completed_at) : null,
    }));

    return {
      profile: mappedProfile,
      weakAreas: getWeakAreasIntelligent(mappedAttempts, questionsById),
      improvingSkills: getImprovingSkillsIntelligent(mappedAttempts, questionsById),
      skillInsights: metrics.map((m) => ({
        skill_tag: m.skill_tag,
        attempts: m.attempts,
        accuracy: m.accuracy,
        skillScore: m.skillScore,
        hasTimingIssue: m.hasTimingIssue,
        hasConceptGap: m.hasConceptGap,
        recoveredMistakes: m.recoveredMistakes,
        retryRate: m.retryRate,
      })),
      conceptGaps: getConceptGaps(mappedAttempts, questionsById),
      reviewRecommendations: getReviewRecommendations(mappedAttempts, questionsById),
      timingIssues,
      recentMistakes,
      recentSessions: mappedSessions,
      streak: calculateStreak(mappedSessions),
      estimatedProgress: mappedProfile ? estimateProgress(mappedProfile, stats) : 0,
      gradePathProgress: gradePathProgress(mappedSessions),
      recommendedSessionLabel: mappedProfile
        ? recommendedSessionLabel(mappedProfile)
        : "Guided study session",
      nextStudy: mappedProfile
        ? nextStudyForProfile(
            mappedProfile,
            getNextStudyRecommendationIntelligent(mappedAttempts, questionsById, {
              beginnerPath: mappedProfile.beginner_path,
              timingIssues,
            })
          )
        : getNextStudyRecommendationIntelligent(mappedAttempts, questionsById),
      learningPhaseLabel: rigor.trackLabel,
    };
  } catch (error) {
    rethrowFrameworkError(error);
    logServerError("getDashboardData", error);
    return {
      error: actionErrorMessage(error, "Could not load dashboard."),
      profile: null,
      weakAreas: [],
      improvingSkills: [],
      skillInsights: [],
      conceptGaps: [],
      reviewRecommendations: [],
      timingIssues: false,
      recentMistakes: [],
      recentSessions: [],
      streak: 0,
      estimatedProgress: 0,
      gradePathProgress: 0,
      recommendedSessionLabel: "Guided study session",
      nextStudy: "Something went wrong loading your dashboard.",
      learningPhaseLabel: null,
    };
  }
}

export async function getSessionData(sessionId: string) {
  try {
    if (!hasSupabaseConfig()) {
      return { error: "Database not configured. Add Supabase keys to .env.local." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: session } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("student_id", user.id)
      .single();

    if (!session) return null;

    let phasePlan = normalizePhasePlan((session.phase_plan ?? {}) as Record<string, unknown>);

    const { data: bankRows } = await supabase.from("questions").select("*");
    const sessionBank = prepareSessionBank(
      (bankRows ?? []).map((row) => mapQuestion(row as Record<string, unknown>))
    );

    if (phasePlanHasInvalidIds(phasePlan)) {
      const repaired = repairPhasePlan(phasePlan, sessionBank);
      phasePlan = repaired;
      await supabase.from("study_sessions").update({ phase_plan: repaired }).eq("id", sessionId);
    }

    const readingRepaired = repairReadingInPhasePlan(phasePlan, sessionBank);
    if (JSON.stringify(readingRepaired) !== JSON.stringify(phasePlan)) {
      phasePlan = readingRepaired;
      await supabase.from("study_sessions").update({ phase_plan: readingRepaired }).eq("id", sessionId);
    }

    const allIds = [
      ...phasePlan.warmup,
      ...phasePlan.focus,
      ...phasePlan.timed,
      ...phasePlan.mixed,
      ...phasePlan.mistakes,
    ];
    const dbIds = filterUuidIds([...new Set(allIds)]);

    const { data: questions } =
      dbIds.length > 0
        ? await supabase.from("questions").select("*").in("id", dbIds)
        : { data: [] };

    const dbQuestions = (questions ?? []).map((row) => mapQuestion(row as Record<string, unknown>));
    const questionsById = resolveSessionQuestions([...new Set(allIds)], dbQuestions);

    const [{ data: profile }, { data: sessionAttempts }, { data: allAttempts }, { count: completedSessions }] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("attempts").select("*").eq("session_id", sessionId).eq("student_id", user.id),
        supabase
          .from("attempts")
          .select("*")
          .eq("student_id", user.id)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("study_sessions")
          .select("id", { count: "exact", head: true })
          .eq("student_id", user.id)
          .eq("status", "completed"),
      ]);

    const mappedProfile = profile ? mapProfileRow(profile as Record<string, unknown>) : null;
    const focusId = phasePlan.focus[0];
    const focusSkill = focusId && questionsById[focusId] ? questionsById[focusId].skill : null;

    const mappedAttempts = (sessionAttempts ?? []).map((a) =>
      mapAttemptRow(a as Record<string, unknown>)
    );
    const allMappedAttempts = (allAttempts ?? []).map((a) =>
      mapAttemptRow(a as Record<string, unknown>)
    );
    const allQuestionsById = new Map(sessionBank.map((q) => [q.id, q]));
    const metrics = computeSkillIntelligence(allMappedAttempts, allQuestionsById);
    const rigor = gradeRigorFromProfile(
      mappedProfile,
      allMappedAttempts,
      completedSessions ?? 0,
      metrics
    );

    return {
      session: {
        id: String(session.id),
        student_id: String(session.student_id),
        status: session.status as "in_progress" | "completed",
        current_phase: (session.current_phase === "review"
          ? "mistakes"
          : session.current_phase) as SessionPhase,
        phase_plan: phasePlan,
        started_at: String(session.started_at),
        completed_at: session.completed_at ? String(session.completed_at) : null,
      },
      questionsById,
      slowMode: Boolean(mappedProfile?.slow_mode ?? mappedProfile?.beginner_path),
      studyMode: mappedProfile ? studyModeFromProfile(mappedProfile) : "standard",
      studyMinutes: mappedProfile?.study_minutes_per_day ?? 30,
      focusSkill: focusSkillLabel(focusSkill),
      studyTrackLabel: rigor.trackLabel,
      foundationReadiness: rigor.readiness,
      sessionAttempts: mappedAttempts,
    };
  } catch (error) {
    rethrowFrameworkError(error);
    logServerError("getSessionData", error, { sessionId });
    return { error: actionErrorMessage(error, "Could not load session.") };
  }
}
