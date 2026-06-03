import type {
  Attempt,
  ComfortLevel,
  Grade,
  MistakeType,
  Profile,
  Question,
  SatExperience,
} from "./types";

export type GradePathInfo = {
  label: string;
  summary: string;
  focus: string[];
};

export const GRADE_PATHS: Record<Grade, GradePathInfo> = {
  "9th": {
    label: "9th grade — Foundations path",
    summary: "Build study habits, light PSAT/SAT exposure, and core math & reading skills.",
    focus: ["Study habits", "Core math", "Reading basics", "Light timed practice"],
  },
  "10th": {
    label: "10th grade — PSAT & base skills",
    summary: "PSAT preview, find weak areas early, and strengthen math and reading.",
    focus: ["PSAT preview", "Weak-area checks", "Math base", "Reading base"],
  },
  "11th": {
    label: "11th grade — Main test prep",
    summary: "Focused SAT prep, timed practice, signup guidance, and score growth.",
    focus: ["Timed blocks", "Weak skills", "Test signup", "Score growth"],
  },
  "12th": {
    label: "12th grade — Final push",
    summary: "Last test attempts, deadlines, focused review, and score polish.",
    focus: ["Deadlines", "Focused review", "Score polish", "Quick wins"],
  },
};

export function gradePathFor(grade: Grade | null): GradePathInfo {
  return GRADE_PATHS[grade ?? "11th"];
}

export function isBeginnerProfile(
  experience: SatExperience | null,
  comfort: ComfortLevel | null
): boolean {
  return experience === "never" || comfort === "lost" || comfort === "unsure";
}

export function shouldUseSlowMode(profile: Pick<Profile, "comfort_level" | "slow_mode" | "beginner_path">): boolean {
  if (profile.slow_mode) return true;
  if (profile.beginner_path) return true;
  return profile.comfort_level === "lost" || profile.comfort_level === "unsure";
}

export function inferMistakeType(
  question: Question,
  timeTaken: number,
  isCorrect: boolean
): MistakeType | null {
  if (isCorrect) return null;

  const types = question.mistakeTypes;
  if (timeTaken > question.estimatedTime * 1.35 && types.includes("timing")) return "timing";
  if (question.section === "reading" && types.includes("misread")) return "misread";
  if (question.section === "reading" && types.includes("vocabulary")) return "vocabulary";
  if (question.section === "math" && types.includes("setup_error")) return "setup_error";
  if (types.includes("concept_gap")) return "concept_gap";
  if (types.includes("careless")) return "careless";
  return types[0] ?? "concept_gap";
}

export function buildTakeawayBullets(
  wrongAttempts: Attempt[],
  questionsById: Record<string, Question>
): string[] {
  const bullets: string[] = [];
  const skills = new Set<string>();

  for (const a of wrongAttempts.slice(0, 5)) {
    const q = questionsById[a.question_id];
    if (!q) continue;
    skills.add(q.skill);
    if (a.mistake_type === "timing") {
      bullets.push(`Slow down on ${q.skill} — try one step at a time.`);
    } else if (a.mistake_type === "vocabulary") {
      bullets.push(`Circle key words in the passage before you pick an answer.`);
    } else if (q.underlyingConcept) {
      bullets.push(`Review: ${q.underlyingConcept}`);
    }
  }

  if (bullets.length === 0 && skills.size > 0) {
    bullets.push(`Keep practicing ${[...skills].slice(0, 2).join(" and ")} — you're building the habit.`);
  }
  if (bullets.length === 0) {
    bullets.push("Nice focus tonight. Come back tomorrow for a short session.");
  }
  return [...new Set(bullets)].slice(0, 4);
}

export function simplifyExplanation(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 2) return text;
  return sentences.slice(0, 2).join(" ");
}
