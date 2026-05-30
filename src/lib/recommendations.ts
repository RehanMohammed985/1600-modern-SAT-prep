import type { Attempt, Profile, Question, SkillStats, StudySession } from "./types";
import {
  adaptiveStudyMessage,
  buildReviewRecommendations,
  detectConceptGaps,
  detectTimingIssues,
  getImprovingFromMetrics,
  getWeakAreasFromMetrics,
} from "@/lib/intelligence/insights";
import { computeSkillIntelligence } from "@/lib/intelligence/skill-score";
import { pickAdaptiveFocusSkill } from "@/lib/intelligence/adaptive";

export { computeSkillIntelligence, type SkillMetrics } from "@/lib/intelligence/skill-score";

export function buildSkillStats(
  attempts: Attempt[],
  questionsById: Map<string, Question>
): SkillStats[] {
  return computeSkillIntelligence(attempts, questionsById).map((m) => ({
    skill_tag: m.skill_tag,
    attempts: m.attempts,
    correct: m.correct,
    accuracy: m.accuracy,
  }));
}

export function getWeakAreas(stats: SkillStats[]) {
  return stats.filter((s) => s.attempts >= 2 && s.accuracy < 0.6);
}

export function getWeakAreasIntelligent(
  attempts: Attempt[],
  questionsById: Map<string, Question>
) {
  const metrics = computeSkillIntelligence(attempts, questionsById);
  return getWeakAreasFromMetrics(metrics);
}

export function getImprovingSkills(stats: SkillStats[]) {
  return stats.filter((s) => s.attempts >= 2 && s.accuracy >= 0.75);
}

export function getImprovingSkillsIntelligent(
  attempts: Attempt[],
  questionsById: Map<string, Question>
) {
  return getImprovingFromMetrics(computeSkillIntelligence(attempts, questionsById));
}

export function hasTimingIssues(
  attempts: Attempt[],
  questionsById: Map<string, Question>
): boolean {
  const metrics = computeSkillIntelligence(attempts, questionsById);
  return detectTimingIssues(metrics);
}

export function pickFocusSkill(stats: SkillStats[]): string | null {
  if (!stats.length) return null;
  return stats.reduce((a, b) => (a.accuracy < b.accuracy ? a : b)).skill_tag;
}

export function pickFocusSkillIntelligent(
  attempts: Attempt[],
  questionsById: Map<string, Question>
): string | null {
  const metrics = computeSkillIntelligence(attempts, questionsById);
  return pickAdaptiveFocusSkill(metrics);
}

export function getNextStudyRecommendation(
  stats: SkillStats[],
  options?: { beginnerPath?: boolean; timingIssues?: boolean }
): string {
  return adaptiveStudyMessage(
    stats.map((s) => ({
      skill_tag: s.skill_tag,
      attempts: s.attempts,
      correct: Math.round(s.accuracy * s.attempts),
      accuracy: s.accuracy,
      speed: 0.5,
      consistency: 0.5,
      confidence: 0.5,
      retention: 0.5,
      skillScore: s.accuracy,
      retryRate: 0,
      reviewUsageRate: 0,
      recoveredMistakes: 0,
      hasTimingIssue: false,
      hasConceptGap: false,
    })),
    options
  );
}

export function getNextStudyRecommendationIntelligent(
  attempts: Attempt[],
  questionsById: Map<string, Question>,
  options?: { beginnerPath?: boolean; timingIssues?: boolean }
): string {
  const metrics = computeSkillIntelligence(attempts, questionsById);
  return adaptiveStudyMessage(metrics, options);
}

export function getReviewRecommendations(
  attempts: Attempt[],
  questionsById: Map<string, Question>
) {
  return buildReviewRecommendations(computeSkillIntelligence(attempts, questionsById));
}

export function getConceptGaps(
  attempts: Attempt[],
  questionsById: Map<string, Question>
) {
  return detectConceptGaps(computeSkillIntelligence(attempts, questionsById));
}

import { sessionDurationLabel } from "./session-length";

export function recommendedSessionLabel(profile: Profile): string {
  const duration = sessionDurationLabel(profile.study_minutes_per_day);
  if (profile.slow_mode || profile.beginner_path) {
    return `Adaptive session · slow mode · ${duration}`;
  }
  return `Adaptive session · warmup → focus → mixed → timed → review · ${duration}`;
}

export function calculateStreak(sessions: StudySession[]): number {
  const completedDays = new Set(
    sessions
      .filter((s) => s.status === "completed" && s.completed_at)
      .map((s) => s.completed_at!.slice(0, 10))
  );

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (completedDays.has(key)) {
      streak += 1;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

export function estimateProgress(profile: Profile, stats: SkillStats[]): number {
  const metrics = stats.map((s) => s.accuracy);
  const avgAccuracy = metrics.length
    ? metrics.reduce((a, b) => a + b, 0) / metrics.length
    : 0;
  const sessionBoost = Math.min(
    stats.reduce((sum, s) => sum + s.attempts, 0) * 2,
    profile.beginner_path ? 40 : 80
  );

  if (profile.beginner_path || profile.current_score == null) {
    return Math.min(100, Math.round(sessionBoost + avgAccuracy * 35));
  }

  const current = profile.current_score;
  const target = profile.target_score ?? 1200;
  const range = Math.max(target - current, 1);
  const practiceBoost = Math.min(stats.reduce((sum, s) => sum + s.attempts, 0) * 1.5, 120);
  return Math.min(100, Math.round(((avgAccuracy * practiceBoost) / range) * 100));
}

export function gradePathProgress(sessions: StudySession[]): number {
  const completed = sessions.filter((s) => s.status === "completed").length;
  return Math.min(100, completed * 12);
}
