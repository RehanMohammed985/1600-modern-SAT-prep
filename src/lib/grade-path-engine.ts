import type { Grade } from "./types";
import type { SkillMetrics } from "./intelligence/skill-score";

/** 9th/10th progression; 11th/12th use SAT prep phases */
export type LearningPhase =
  | "concept_mastery"
  | "skill_reinforcement"
  | "sat_transition"
  | "sat_readiness";

export const GRADE_FOCUS_SKILLS: Record<Grade, string[]> = {
  "9th": [
    "algebra-linear",
    "geometry-basics",
    "percent-ratios",
    "writing-grammar",
    "reading-main-idea",
  ],
  "10th": [
    "algebra-linear",
    "geometry-basics",
    "functions",
    "reading-evidence",
    "reading-vocabulary",
    "percent-ratios",
  ],
  "11th": [
    "algebra-linear",
    "functions",
    "data-interpretation",
    "reading-evidence",
    "reading-inference",
    "probability",
  ],
  "12th": [
    "functions",
    "data-interpretation",
    "probability",
    "reading-inference",
    "reading-evidence",
    "algebra-linear",
  ],
};

export function learningPhaseForStudent(
  grade: Grade | null,
  readiness: number,
  avgSkillScore: number
): LearningPhase {
  if (grade === "11th") {
    return avgSkillScore >= 0.72 ? "sat_readiness" : "sat_transition";
  }
  if (grade === "12th") return "sat_readiness";

  if (readiness < 35 || avgSkillScore < 0.45) return "concept_mastery";
  if (readiness < 55 || avgSkillScore < 0.58) return "skill_reinforcement";
  if (readiness < 75 || avgSkillScore < 0.72) return "sat_transition";
  return "sat_readiness";
}

export function learningPhaseLabel(phase: LearningPhase, grade: Grade | null): string {
  switch (phase) {
    case "concept_mastery":
      return grade === "9th"
        ? "Phase 1 — Concept mastery (Algebra 1, geometry & reading basics)"
        : "Phase 1 — Concept mastery (foundations before SAT wording)";
    case "skill_reinforcement":
      return "Phase 2 — Skill reinforcement (practice until it sticks)";
    case "sat_transition":
      return "Phase 3 — Transition to SAT-style questions";
    case "sat_readiness":
      return grade === "12th"
        ? "Phase 4 — SAT readiness (timed sections & score polish)"
        : "Phase 4 — SAT readiness (test-style practice)";
  }
}

export function phaseAllowsSatStyle(phase: LearningPhase): boolean {
  return phase === "sat_transition" || phase === "sat_readiness";
}

export function phaseAllowsTimedPressure(grade: Grade | null, phase: LearningPhase): boolean {
  if (grade === "9th" && phase === "concept_mastery") return false;
  if (grade === "10th" && phase === "concept_mastery") return false;
  return phase !== "concept_mastery";
}

export function averageSkillScore(metrics: SkillMetrics[]): number {
  if (!metrics.length) return 0.5;
  return metrics.reduce((s, m) => s + m.skillScore, 0) / metrics.length;
}
