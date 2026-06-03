import type { PhaseCounts } from "@/lib/session-length";
import type { SkillState } from "./knowledge-tracing";
import { computeAdaptiveDifficulty, skillMasteryLevel } from "./knowledge-tracing";
import type { ReviewCard } from "./spaced-repetition";
import { getOverdueCards } from "./spaced-repetition";
import type { MistakePattern } from "./mistake-patterns";

export type StudyPlanDay = {
  day: string;
  dayIndex: number;
  focusSkill: string;
  sessionMinutes: number;
  phaseCounts: PhaseCounts;
  reviewSkills: string[];
  predictedGain: number;
  rationale: string;
};

export type WeeklyPlan = {
  weekStart: string;
  days: StudyPlanDay[];
  totalSessions: number;
  totalMinutes: number;
  predictedScoreBefore: number;
  predictedScoreAfter: number;
  focusDistribution: { skillTag: string; sessions: number }[];
  reviewSchedule: { skillTag: string; dueDay: number }[];
};

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DEFAULT_SESSION_MINUTES = 30;

function skillLabel(skillTag: string): string {
  return skillTag
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function generateWeeklyPlan(
  skillStates: SkillState[],
  reviewCards: ReviewCard[],
  mistakePatterns: MistakePattern[],
  studyMinutesPerDay: number = DEFAULT_SESSION_MINUTES,
  currentScore: number = 800,
  targetScore: number = 1200
): WeeklyPlan {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const rankedSkills = rankSkillsForWeek(skillStates, mistakePatterns, reviewCards);
  const overdueCards = getOverdueCards(reviewCards);
  const days: StudyPlanDay[] = [];
  let totalGain = 0;

  const usedSkills = new Set<string>();
  const focusDistribution = new Map<string, number>();

  for (let i = 0; i < 7; i++) {
    const isWeekend = i >= 5;
    const sessionMinutes = isWeekend ? Math.round(studyMinutesPerDay * 0.7) : studyMinutesPerDay;
    if (sessionMinutes < 15) continue;

    const available = rankedSkills.filter(
      (s) => !usedSkills.has(s.skillTag) || s.pMastered < 0.5
    );

    const focusSkill = available[i] ?? rankedSkills[i % rankedSkills.length];
    if (!focusSkill) continue;

    usedSkills.add(focusSkill.skillTag);
    focusDistribution.set(
      focusSkill.skillTag,
      (focusDistribution.get(focusSkill.skillTag) ?? 0) + 1
    );

    const difficulty = computeAdaptiveDifficulty(focusSkill.pMastered, focusSkill.opportunities);
    const phaseCounts = buildPhaseCountsForSkill(difficulty, sessionMinutes, isWeekend);

    const reviewSkills: string[] = [];
    for (const card of overdueCards) {
      if (card.skillTag !== focusSkill.skillTag && !reviewSkills.includes(card.skillTag)) {
        reviewSkills.push(card.skillTag);
        if (reviewSkills.length >= 2) break;
      }
    }

    const gain = estimateDailyGain(focusSkill, reviewSkills.length);
    totalGain += gain;

    const patterns = mistakePatterns.filter(
      (p) => p.skillTag === focusSkill.skillTag && p.recurring
    );
    const patternNote = patterns.length
      ? `Focus on ${patterns.map((p) => p.mistakeType.replace(/_/g, " ")).join(", ")}`
      : "";

    const level = skillMasteryLevel(focusSkill.pMastered);
    const rationale = buildDayRationale(
      skillLabel(focusSkill.skillTag),
      level,
      patternNote,
      isWeekend
    );

    days.push({
      day: DAY_NAMES[i],
      dayIndex: i,
      focusSkill: focusSkill.skillTag,
      sessionMinutes,
      phaseCounts,
      reviewSkills,
      predictedGain: gain,
      rationale,
    });
  }

  const totalSessions = days.length;
  const totalMinutes = days.reduce((s, d) => s + d.sessionMinutes, 0);

  const predictedScoreAfter = Math.min(
    1600,
    currentScore + totalGain + (targetScore > currentScore ? Math.round((targetScore - currentScore) * 0.15) : 0)
  );

  const reviewSchedule: { skillTag: string; dueDay: number }[] = [];
  for (const card of overdueCards) {
    const dayIdx = days.findIndex((d) => d.focusSkill !== card.skillTag);
    if (dayIdx >= 0) {
      reviewSchedule.push({ skillTag: card.skillTag, dueDay: dayIdx });
    }
  }

  return {
    weekStart: weekStartStr,
    days,
    totalSessions,
    totalMinutes,
    predictedScoreBefore: currentScore,
    predictedScoreAfter: Math.min(1600, predictedScoreAfter),
    focusDistribution: Array.from(focusDistribution.entries()).map(([skillTag, sessions]) => ({
      skillTag,
      sessions,
    })),
    reviewSchedule,
  };
}

function rankSkillsForWeek(
  skillStates: SkillState[],
  mistakePatterns: MistakePattern[],
  reviewCards: ReviewCard[]
): SkillState[] {
  const patternMap = new Map(
    mistakePatterns.map((p) => [p.skillTag, p])
  );
  const cardMap = new Map(
    reviewCards.map((c) => [c.skillTag, c])
  );

  return [...skillStates].sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    const patternA = patternMap.get(a.skillTag);
    const patternB = patternMap.get(b.skillTag);
    const cardA = cardMap.get(a.skillTag);
    const cardB = cardMap.get(b.skillTag);

    if (patternA?.recurring) scoreA += 30;
    if (patternB?.recurring) scoreB += 30;

    if (a.pMastered < 0.4) scoreA += 50;
    else if (a.pMastered < 0.6) scoreA += 30;
    else if (a.pMastered < 0.78) scoreA += 10;

    if (b.pMastered < 0.4) scoreB += 50;
    else if (b.pMastered < 0.6) scoreB += 30;
    else if (b.pMastered < 0.78) scoreB += 10;

    if (cardA && new Date(cardA.nextReviewAt) <= new Date()) scoreA += 20;
    if (cardB && new Date(cardB.nextReviewAt) <= new Date()) scoreB += 20;

    if (a.opportunities < 3) scoreA += 15;
    if (b.opportunities < 3) scoreB += 15;

    return scoreB - scoreA;
  });
}

function buildPhaseCountsForSkill(
  difficulty: number,
  sessionMinutes: number,
  isWeekend: boolean
): PhaseCounts {
  const factor = isWeekend ? 0.7 : 1;
  const base = Math.max(1, Math.round(sessionMinutes / 6));

  if (difficulty <= 2) {
    return {
      warmup: Math.max(1, Math.round(2 * factor)),
      focus: Math.max(1, Math.round(base * factor)),
      mixed: Math.max(1, Math.round(2 * factor)),
      timed: Math.max(1, Math.round(1 * factor)),
      mistakes: Math.max(1, Math.round(2 * factor)),
    };
  }

  return {
    warmup: Math.max(1, Math.round(2 * factor)),
    focus: Math.max(1, Math.round(base * factor)),
    mixed: Math.max(1, Math.round(2 * factor)),
    timed: Math.max(1, Math.round(3 * factor)),
    mistakes: Math.max(1, Math.round(2 * factor)),
  };
}

function estimateDailyGain(
  skill: SkillState,
  reviewCount: number
): number {
  const baseGain = 5;
  const lowMasteryBonus = skill.pMastered < 0.4 ? 15 : skill.pMastered < 0.6 ? 8 : 2;
  const lowOpportunityBonus = skill.opportunities < 3 ? 10 : 0;
  const reviewBonus = reviewCount * 3;
  return baseGain + lowMasteryBonus + lowOpportunityBonus + reviewBonus;
}

function buildDayRationale(
  skillLabel: string,
  level: string,
  patternNote: string,
  isWeekend: boolean
): string {
  const levelNote =
    level === "novice"
      ? `Build foundations in ${skillLabel}`
      : level === "developing"
        ? `Strengthen ${skillLabel} with guided practice`
        : level === "proficient"
          ? `Challenge ${skillLabel} with harder problems`
          : `Maintain ${skillLabel} mastery`;

  const parts = [levelNote];
  if (patternNote) parts.push(patternNote);
  if (isWeekend) parts.push("Lighter session");
  return parts.join(" — ");
}

export function generateStudyPlanSummary(
  plan: WeeklyPlan,
  scoreGain: number
): string {
  const days = plan.days.length;
  const avgFocus = plan.days.length
    ? Math.round(plan.days.reduce((s, d) => s + d.sessionMinutes, 0) / plan.days.length)
    : 30;

  return [
    `This week: ${days} sessions, ~${plan.totalMinutes} min total`,
    `Focus: ${plan.focusDistribution.slice(0, 3).map((f) => `${f.skillTag} (${f.sessions}x)`).join(", ")}`,
    `Predicted improvement: +${scoreGain} points`,
    `Goal: ${plan.predictedScoreBefore} → ${plan.predictedScoreAfter}`,
    `~${avgFocus} min per session, ${Math.round(scoreGain / Math.max(1, days))} pts per session avg`,
  ].join("\n");
}
