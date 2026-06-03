export type Grade = "9th" | "10th" | "11th" | "12th";
export type SatExperience = "never" | "practice" | "official";
export type TestTrack = "sat" | "undecided";
export type TestTimeline =
  | "not_sure"
  | "within_3_months"
  | "within_6_months"
  | "this_year"
  | "next_year";
export type ComfortLevel = "lost" | "basics" | "improving" | "unsure";
export type TestSignupStatus = "signed_up" | "not_signed_up" | "not_sure";
export type ConfidenceLevel = "low" | "medium" | "high";
export type MistakeType =
  | "careless"
  | "concept_gap"
  | "timing"
  | "misread"
  | "vocabulary"
  | "sign_error"
  | "setup_error";

export type SessionPhase =
  | "warmup"
  | "focus"
  | "timed"
  | "mixed"
  | "mistakes"
  | "takeaway"
  | "complete";

export type PhasePlan = Record<SessionPhase, string[]>;

export type Profile = {
  id: string;
  email: string | null;
  grade: Grade | null;
  current_score: number | null;
  target_score: number | null;
  test_date: string | null;
  planned_test_date: string | null;
  study_minutes_per_day: number | null;
  onboarding_completed: boolean;
  sat_experience: SatExperience | null;
  test_track: TestTrack | null;
  registered_for_test: boolean | null;
  test_signup_status: TestSignupStatus | null;
  test_timeline: TestTimeline | null;
  study_plan_label: string | null;
  grade_path_label: string | null;
  beginner_path: boolean;
  comfort_level: ComfortLevel | null;
  parent_email: string | null;
  slow_mode: boolean;
};

export type ReadingPassageMeta = {
  passageText: string;
  difficulty: number;
  tone: string | null;
  topic: string | null;
  readingSkill: string | null;
  estimatedReadSeconds: number;
  /** Future: single passage vs paired passages */
  passageType?: "single" | "paired";
  /** Future: question IDs tied to this passage for evidence-based sets */
  linkedQuestionIds?: string[];
  /** Future: original generated content id for cache/dedup */
  contentSourceId?: string | null;
};

export type Question = {
  id: string;
  testType: "sat";
  section: "math" | "reading";
  skill: string;
  subskill: string | null;
  difficulty: number;
  questionText: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
  conceptExplanation: string | null;
  formulaOrRule: string | null;
  formulaLatex: string | null;
  underlyingConcept: string | null;
  commonMistakes: string[];
  mistakeTypes: MistakeType[];
  estimatedTime: number;
  passage: ReadingPassageMeta | null;
  status: "active" | "draft";
  questionStyle?: string | null;
  commonMistakeExplanation?: string | null;
  blueprintHash?: string | null;
  contentHash?: string | null;
  parentQuestionId?: string | null;
  variationType?: "base" | "easier" | "harder";
  generatedBy?: "seed" | "factory" | "manual";
  validationStatus?: "pending" | "approved" | "rejected";
  /** @deprecated use questionText */
  prompt: string;
  /** @deprecated use skill */
  skill_tag: string;
  /** @deprecated use correctAnswer */
  correct_answer: string;
  estimated_seconds: number;
};

export type StudySession = {
  id: string;
  student_id: string;
  status: "in_progress" | "completed";
  current_phase: SessionPhase;
  phase_plan: PhasePlan;
  started_at: string;
  completed_at: string | null;
};

export type Attempt = {
  id: string;
  student_id: string;
  question_id: string;
  session_id: string | null;
  answer: string;
  is_correct: boolean;
  time_taken_seconds: number;
  confidence: ConfidenceLevel | null;
  mistake_type: MistakeType | null;
  understood_explanation: boolean | null;
  review_later: boolean;
  retry_index: number;
  used_simpler_explanation: boolean;
  viewed_formula: boolean;
  requested_similar: boolean;
  mistake_recovered: boolean;
  arena_completed: boolean;
  parent_attempt_id: string | null;
  created_at: string;
};

export type SkillIntelligence = {
  skill_tag: string;
  attempts: number;
  accuracy: number;
  skillScore: number;
  hasTimingIssue: boolean;
  hasConceptGap: boolean;
  recoveredMistakes?: number;
  retryRate?: number;
};

export type SkillStats = {
  skill_tag: string;
  attempts: number;
  correct: number;
  accuracy: number;
};

export type RecentMistake = {
  questionId: string;
  skill: string;
  mistakeType: MistakeType | null;
  answeredAt: string;
  reviewLater: boolean;
  recovered?: boolean;
};

export type DashboardInsights = {
  weakAreas: SkillStats[];
  improvingSkills: SkillStats[];
  timingIssues: boolean;
  recentMistakes: RecentMistake[];
  recentSessions: StudySession[];
  streak: number;
  estimatedProgress: number;
  nextStudy: string;
  recommendedSessionLabel: string;
  gradePathProgress: number;
};

export const SKILL_LABELS: Record<string, string> = {
  "algebra-linear": "Linear equations",
  "percent-ratios": "Percents & ratios",
  "geometry-basics": "Geometry basics",
  functions: "Functions",
  probability: "Probability",
  "data-interpretation": "Data interpretation",
  "reading-main-idea": "Main idea",
  "reading-evidence": "Evidence questions",
  "reading-vocabulary": "Vocabulary in context",
  "reading-inference": "Inference",
  "writing-grammar": "Grammar & sentences",
  "writing-style": "Style & word choice",
};

export const MISTAKE_TYPE_LABELS: Record<MistakeType, string> = {
  careless: "Careless error",
  concept_gap: "Concept gap",
  timing: "Timing issue",
  misread: "Misread the question",
  vocabulary: "Vocabulary issue",
  sign_error: "Sign error",
  setup_error: "Setup error",
};

export const PHASE_ORDER: SessionPhase[] = [
  "warmup",
  "focus",
  "timed",
  "mixed",
  "mistakes",
  "takeaway",
  "complete",
];

export const PHASE_LABELS: Record<SessionPhase, string> = {
  warmup: "Warmup",
  focus: "Main focus",
  timed: "Timed practice",
  mixed: "Mixed review",
  mistakes: "Mistake review",
  takeaway: "Today's takeaway",
  complete: "Complete",
};

export const QUESTION_PHASES: Exclude<SessionPhase, "takeaway" | "complete">[] = [
  "warmup",
  "focus",
  "timed",
  "mixed",
  "mistakes",
];
