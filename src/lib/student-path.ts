import { gradePathFor, isBeginnerProfile, shouldUseSlowMode } from "./tutoring";

export { gradePathFor, GRADE_PATHS } from "./tutoring";
import type {
  ComfortLevel,
  Grade,
  Profile,
  SatExperience,
  TestSignupStatus,
  TestTimeline,
  TestTrack,
} from "./types";

export const SAT_SIGNUP_URL = "https://satsuite.collegeboard.org/sat/registration";
export const ACT_SIGNUP_URL = "https://www.act.org/content/act/en/products-and-services/the-act/registration.html";

export const TIMELINE_OPTIONS: { value: TestTimeline; label: string; hint: string }[] = [
  { value: "not_sure", label: "I'm not sure yet", hint: "Totally fine — we'll keep things flexible." },
  { value: "within_3_months", label: "In the next 3 months", hint: "We'll pace you with shorter daily sessions." },
  { value: "within_6_months", label: "In the next 6 months", hint: "Room to build skills without rushing." },
  { value: "this_year", label: "Later this school year", hint: "Steady practice beats cramming." },
  { value: "next_year", label: "Next year or later", hint: "Great time to build foundations early." },
];

export const COMFORT_OPTIONS: {
  value: ComfortLevel;
  title: string;
  description: string;
}[] = [
  { value: "lost", title: "I'm lost", description: "We'll start simple and go step by step." },
  { value: "basics", title: "I know the basics", description: "You have some footing — we'll fill the gaps." },
  {
    value: "improving",
    title: "I'm trying to improve my score",
    description: "We'll focus on misses and timed practice.",
  },
  { value: "unsure", title: "I don't know", description: "That's okay — we'll figure it out together." },
];

export const SIGNUP_STATUS_OPTIONS: {
  value: TestSignupStatus;
  title: string;
  hint: string;
}[] = [
  { value: "signed_up", title: "Already signed up", hint: "Add your test date if you know it." },
  { value: "not_signed_up", title: "Not signed up yet", hint: "We'll help you pick a date when you're ready." },
  { value: "not_sure", title: "Not sure", hint: "No pressure — prep still helps before you register." },
];

export function defaultTargetForGrade(grade: Grade | null): number {
  switch (grade) {
    case "9th":
      return 1100;
    case "10th":
      return 1150;
    case "12th":
      return 1280;
    default:
      return 1200;
  }
}

export function buildStudyPlanLabel(
  profile: Pick<Profile, "sat_experience" | "grade" | "beginner_path" | "comfort_level">
): string {
  const path = gradePathFor(profile.grade);
  if (profile.beginner_path || profile.sat_experience === "never") {
    return `${path.label} — calm start, no score required`;
  }
  if (profile.sat_experience === "practice") {
    return `${path.label} — find weak spots and close the gap`;
  }
  return `${path.label} — protect strengths and fix misses`;
}

export function timelineLabel(timeline: TestTimeline | null): string {
  return TIMELINE_OPTIONS.find((t) => t.value === timeline)?.label ?? "Flexible timeline";
}

export function signupGuidance(
  track: TestTrack | null,
  status: TestSignupStatus | null
): string {
  if (status === "signed_up") {
    return "You're signed up — we'll line up practice with your test timeline.";
  }
  if (status === "not_signed_up") {
    return "Not signed up yet? We'll help you choose a test date when you're ready.";
  }
  if (track === "act") {
    return "When you're ready, register for the ACT so you have a date to work toward.";
  }
  return "You don't need a test date today. When you're ready, sign up so prep has a clear finish line.";
}

export function signupUrl(track: TestTrack | null): string {
  return track === "act" ? ACT_SIGNUP_URL : SAT_SIGNUP_URL;
}

export function dashboardTitle(profile: Pick<Profile, "sat_experience" | "beginner_path" | "grade">): string {
  if (profile.beginner_path || profile.sat_experience === "never") {
    return "Your tutor plan is ready";
  }
  return "Ready for tonight?";
}

export function dashboardDescription(
  profile: Pick<Profile, "sat_experience" | "beginner_path" | "grade_path_label">
): string {
  if (profile.grade_path_label) {
    return profile.grade_path_label;
  }
  if (profile.beginner_path || profile.sat_experience === "never") {
    return "Press start — we'll guide you through warmup, practice, timed work, and review.";
  }
  return "Press start when you're ready. We pick the skills — you just show up.";
}

export function parentSummary(profile: Profile): string {
  const minutes = profile.study_minutes_per_day ?? 30;
  const plan = profile.study_plan_label ?? "Personal study plan";
  const when = profile.test_date
    ? `Test day: ${new Date(profile.test_date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}.`
    : profile.planned_test_date
      ? `Planning for: ${new Date(profile.planned_test_date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}.`
      : `Timeline: ${timelineLabel(profile.test_timeline)}.`;
  const scoreBit =
    profile.current_score != null
      ? `Working from about ${profile.current_score} toward ${profile.target_score ?? "their goal"}.`
      : "Starting without a score yet — building basics first.";
  const mode = profile.slow_mode ? " Slow mode on for comfort." : "";
  return `${plan}. ${scoreBit} ${when} Daily goal: ${minutes} minutes.${mode}`;
}

export function satExplainerShort(): string {
  return "The SAT and ACT are college entrance exams. You don't need a score to start — we'll learn how you think through real questions first.";
}

export function nextStudyForProfile(
  profile: Pick<Profile, "sat_experience" | "beginner_path">,
  skillMessage: string
): string {
  if (profile.beginner_path || profile.sat_experience === "never") {
    if (skillMessage.includes("first") || skillMessage.includes("Tonight")) {
      return skillMessage;
    }
    return "Tonight: a guided session — we'll see what feels easy and what needs work.";
  }
  return skillMessage;
}

export function progressLabel(profile: Pick<Profile, "current_score" | "target_score" | "beginner_path">): {
  title: string;
  subtitle: string;
} {
  if (profile.beginner_path || profile.current_score == null) {
    return {
      title: "Building momentum",
      subtitle: "Based on sessions completed and questions you get right",
    };
  }
  return {
    title: "Toward your goal",
    subtitle: `From ${profile.current_score} toward ${profile.target_score ?? "your target"}`,
  };
}

const VALID_GRADES: Grade[] = ["9th", "10th", "11th", "12th"];
const VALID_EXPERIENCE: SatExperience[] = ["never", "practice", "official"];
const VALID_STUDY_MINUTES = [20, 30, 45, 60, 90] as const;

function clampScore(raw: FormDataEntryValue | null, fallback: number): number | null {
  if (!raw || String(raw).trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 400 || n > 1600) return fallback;
  return Math.round(n);
}

export function parseOnboardingForm(
  formData: FormData
): { error: string } | { data: Record<string, unknown> } {
  const gradeRaw = String(formData.get("grade") || "");
  const grade = VALID_GRADES.includes(gradeRaw as Grade) ? (gradeRaw as Grade) : "11th";

  const expRaw = String(formData.get("sat_experience") || "");
  const satExperience = VALID_EXPERIENCE.includes(expRaw as SatExperience)
    ? (expRaw as SatExperience)
    : "never";

  const comfortRaw = String(formData.get("comfort_level") || "");
  const comfortLevel = COMFORT_OPTIONS.some((c) => c.value === comfortRaw)
    ? (comfortRaw as ComfortLevel)
    : "unsure";

  const testTrack = (formData.get("test_track") as TestTrack) || "undecided";

  const signupRaw = String(formData.get("test_signup_status") || "");
  const testSignupStatus: TestSignupStatus =
    signupRaw === "signed_up" || signupRaw === "not_signed_up" || signupRaw === "not_sure"
      ? signupRaw
      : formData.get("registered_for_test") === "true"
        ? "signed_up"
        : "not_signed_up";

  const registeredForTest = testSignupStatus === "signed_up";
  const testTimeline = (formData.get("test_timeline") as TestTimeline) || "not_sure";

  const minutesRaw = Number(formData.get("study_minutes"));
  const studyMinutes = VALID_STUDY_MINUTES.includes(
    minutesRaw as (typeof VALID_STUDY_MINUTES)[number]
  )
    ? minutesRaw
    : 30;

  const testDateRaw = String(formData.get("test_date") || "").trim();
  const plannedRaw = String(formData.get("planned_test_date") || "").trim();
  const testDate = testSignupStatus === "signed_up" && testDateRaw ? testDateRaw : null;
  const plannedTestDate =
    testSignupStatus === "not_signed_up" && plannedRaw
      ? plannedRaw
      : testSignupStatus === "not_signed_up" && testDateRaw
        ? testDateRaw
        : null;

  const parentEmail = String(formData.get("parent_email") || "").trim() || null;

  const beginnerPath = isBeginnerProfile(satExperience, comfortLevel);
  let currentScore: number | null = null;
  let targetScore: number | null = clampScore(formData.get("target_score"), defaultTargetForGrade(grade));

  if (!beginnerPath) {
    currentScore = clampScore(formData.get("current_score"), defaultTargetForGrade(grade));
  } else {
    currentScore = null;
    if (!formData.get("target_score")) targetScore = defaultTargetForGrade(grade);
  }

  const path = gradePathFor(grade);
  const profileSlice = {
    grade,
    sat_experience: satExperience,
    test_track: testTrack,
    registered_for_test: registeredForTest,
    test_signup_status: testSignupStatus,
    test_timeline: testTimeline,
    beginner_path: beginnerPath,
    comfort_level: comfortLevel,
    study_plan_label: "",
    grade_path_label: path.summary,
  };
  profileSlice.study_plan_label = buildStudyPlanLabel(profileSlice as Profile);

  const slowMode =
    formData.get("slow_mode") === "true" || shouldUseSlowMode({
      comfort_level: comfortLevel,
      slow_mode: false,
      beginner_path: beginnerPath,
    });

  return {
    data: {
      grade,
      sat_experience: satExperience,
      test_track: testTrack,
      registered_for_test: registeredForTest,
      test_signup_status: testSignupStatus,
      test_timeline: testTimeline,
      study_minutes_per_day: studyMinutes,
      test_date: testDate,
      planned_test_date: plannedTestDate,
      current_score: currentScore,
      target_score: targetScore,
      beginner_path: beginnerPath,
      comfort_level: comfortLevel,
      parent_email: parentEmail,
      slow_mode: slowMode,
      study_plan_label: profileSlice.study_plan_label,
      grade_path_label: path.summary,
      onboarding_completed: true,
    },
  };
}
