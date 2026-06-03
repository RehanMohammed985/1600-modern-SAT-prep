import type { Attempt, Grade, Profile, Question } from "./types";
import type { SkillMetrics } from "./intelligence/skill-score";
import {
  averageSkillScore,
  learningPhaseForStudent,
  learningPhaseLabel,
  phaseAllowsSatStyle,
  phaseAllowsTimedPressure,
  type LearningPhase,
} from "./grade-path-engine";

export type StudyTrack = "foundation" | "transition" | "sat_prep";

export function foundationReadiness(
  attempts: Attempt[],
  sessionsCompleted: number
): number {
  if (!attempts.length) return 0;
  const correct = attempts.filter((a) => a.is_correct).length;
  const accuracy = correct / attempts.length;
  const volume = Math.min(attempts.length / 36, 1);
  const consistency = Math.min(sessionsCompleted / 4, 1);
  return Math.round((accuracy * 0.5 + volume * 0.3 + consistency * 0.2) * 100);
}

export function studyTrackFromPhase(phase: LearningPhase): StudyTrack {
  if (phase === "concept_mastery" || phase === "skill_reinforcement") return "foundation";
  if (phase === "sat_transition") return "transition";
  return "sat_prep";
}

export function difficultyBounds(
  grade: Grade | null,
  phase: LearningPhase,
  slowMode?: boolean
): { min: number; max: number } {
  const gradeCap: Record<Grade, number> = {
    "9th": 2,
    "10th": 3,
    "11th": 4,
    "12th": 5,
  };
  const g = grade ?? "11th";
  const cap = gradeCap[g];

  const gradeMin: Record<Grade, number> = {
    "9th": 1,
    "10th": 1,
    "11th": 1,
    "12th": 1,
  };

  switch (phase) {
    case "concept_mastery":
      return slowMode
        ? { min: gradeMin[g], max: Math.min(2, cap) }
        : { min: gradeMin[g], max: Math.min(2, cap) };
    case "skill_reinforcement":
      return slowMode
        ? { min: gradeMin[g], max: Math.min(3, cap) }
        : { min: gradeMin[g], max: Math.min(3, cap) };
    case "sat_transition":
      return slowMode
        ? { min: 2, max: Math.min(3, cap) }
        : { min: 2, max: Math.min(4, cap) };
    case "sat_readiness":
      return slowMode
        ? { min: 2, max: Math.min(4, cap) }
        : { min: 2, max: cap };
  }
}

export function questionFitScore(
  q: Question,
  grade: Grade | null,
  phase: LearningPhase
): number {
  const bounds = difficultyBounds(grade, phase);
  let score = 0;

  if (q.difficulty >= bounds.min && q.difficulty <= bounds.max) score += 40;
  else if (q.difficulty === bounds.max + 1) score += 5;
  else score -= 30;

  if (phase === "concept_mastery" || phase === "skill_reinforcement") {
    if (q.section === "math") score += 15;
    if (q.conceptExplanation) score += 15;
    if (q.section === "reading" && !phaseAllowsSatStyle(phase)) score -= 25;
  }

  if (phaseAllowsSatStyle(phase)) {
    if (q.passage || q.id.startsWith("reading-set-")) score += 12;
  }

  return score;
}

export function filterAndRankForTrack(
  pool: Question[],
  grade: Grade | null,
  phase: LearningPhase
): Question[] {
  return [...pool]
    .map((q) => ({ q, score: questionFitScore(q, grade, phase) }))
    .filter(({ score }) => score > -20)
    .sort((a, b) => b.score - a.score)
    .map(({ q }) => q);
}

export function includeReadingPassages(grade: Grade | null, phase: LearningPhase): boolean {
  if (!phaseAllowsSatStyle(phase)) return grade === "10th" && phase === "skill_reinforcement";
  return true;
}

export function gradeRigorFromProfile(
  profile: Pick<Profile, "grade" | "slow_mode" | "beginner_path"> | null,
  attempts: Attempt[],
  sessionsCompleted: number,
  metrics: SkillMetrics[] = []
) {
  const grade = profile?.grade ?? null;
  const readiness = foundationReadiness(attempts, sessionsCompleted);
  const avgScore = averageSkillScore(metrics);
  const learningPhase = learningPhaseForStudent(grade, readiness, avgScore);
  const track = studyTrackFromPhase(learningPhase);
  const bounds = difficultyBounds(grade, learningPhase, profile?.slow_mode || profile?.beginner_path);

  return {
    grade,
    track,
    learningPhase,
    readiness,
    bounds,
    trackLabel: learningPhaseLabel(learningPhase, grade),
    includeReading: includeReadingPassages(grade, learningPhase),
    allowTimed: phaseAllowsTimedPressure(grade, learningPhase),
  };
}

export type GradeRigor = ReturnType<typeof gradeRigorFromProfile>;
