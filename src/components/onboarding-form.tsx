"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Calendar, ExternalLink, Sparkles } from "lucide-react";
import { saveOnboarding } from "@/app/actions";
import { AppShell, PageHeader, SurfaceCard } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  COMFORT_OPTIONS,
  defaultTargetForGrade,
  gradePathFor,
  SAT_SIGNUP_URL,
  ACT_SIGNUP_URL,
  satExplainerShort,
  SIGNUP_STATUS_OPTIONS,
  TIMELINE_OPTIONS,
} from "@/lib/student-path";
import type { ComfortLevel, Grade, SatExperience, TestSignupStatus, TestTrack, TestTimeline } from "@/lib/types";
import { cn } from "@/lib/utils";

const GRADES: Grade[] = ["9th", "10th", "11th", "12th"];

const EXPERIENCE_OPTIONS: {
  value: SatExperience;
  title: string;
  description: string;
}[] = [
  {
    value: "never",
    title: "I've never taken the SAT or ACT",
    description: "We'll start simple. No score needed today.",
  },
  {
    value: "practice",
    title: "I've taken a practice test",
    description: "PSAT, Khan Academy, or a practice booklet counts.",
  },
  {
    value: "official",
    title: "I already have an official score",
    description: "From a real test — we'll build from there.",
  },
];

const STEPS = [
  "Grade & comfort",
  "Test type",
  "Experience",
  "Goals",
  "Test signup",
  "Daily time",
] as const;

export function OnboardingForm() {
  const [step, setStep] = useState(0);
  const [grade, setGrade] = useState<Grade>("11th");
  const [comfort, setComfort] = useState<ComfortLevel | null>(null);
  const [testTrack, setTestTrack] = useState<TestTrack>("undecided");
  const [experience, setExperience] = useState<SatExperience | null>(null);
  const [signupStatus, setSignupStatus] = useState<TestSignupStatus | null>(null);
  const [timeline, setTimeline] = useState<TestTimeline>("not_sure");
  const [currentScore, setCurrentScore] = useState("");
  const [targetScore, setTargetScore] = useState(String(defaultTargetForGrade("11th")));
  const [testDate, setTestDate] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [studyMinutes, setStudyMinutes] = useState("30");
  const [parentEmail, setParentEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isBeginner = experience === "never" || comfort === "lost" || comfort === "unsure";
  const showCurrentScore = experience === "official" || experience === "practice";
  const signupUrl = testTrack === "act" ? ACT_SIGNUP_URL : SAT_SIGNUP_URL;
  const pathPreview = gradePathFor(grade);

  const canContinue = [
    comfort != null,
    true,
    experience != null,
    experience != null,
    signupStatus != null,
    true,
  ];

  const stepTitle = useMemo(() => {
    const titles = [
      "Let's get to know you",
      "SAT, ACT, or not sure yet?",
      "Your test experience",
      isBeginner ? "Your starting path" : "Your goals (optional scores)",
      "Test signup",
      "Daily study time",
    ];
    return titles[step] ?? "";
  }, [step, isBeginner]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (comfort == null || experience == null || signupStatus == null) {
      setSaveError("Finish each step, then try again.");
      return;
    }

    setLoading(true);
    setSaveError(null);
    const formData = new FormData();
    formData.set("grade", grade);
    formData.set("comfort_level", comfort);
    formData.set("test_track", testTrack);
    formData.set("sat_experience", experience);
    formData.set("test_signup_status", signupStatus);
    formData.set("registered_for_test", String(signupStatus === "signed_up"));
    formData.set("test_timeline", timeline);
    formData.set("study_minutes", studyMinutes);
    formData.set("target_score", targetScore);
    formData.set("parent_email", parentEmail);
    formData.set("slow_mode", String(comfort === "lost" || comfort === "unsure" || isBeginner));
    if (currentScore && !isBeginner) formData.set("current_score", currentScore);
    if (signupStatus === "signed_up" && testDate) formData.set("test_date", testDate);
    if (signupStatus === "not_signed_up" && plannedDate) formData.set("planned_test_date", plannedDate);

    try {
      const result = await saveOnboarding(formData);
      if (result?.error) {
        setSaveError(result.error);
        setLoading(false);
        return;
      }
      if (result?.success) {
        window.location.assign("/dashboard");
        return;
      }
      setSaveError("Could not save. Please try again.");
      setLoading(false);
    } catch {
      setSaveError("Something went wrong. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <AppShell maxWidth="md" homeHref={false}>
      <PageHeader
        eyebrow="Welcome to 1600"
        title="Set up your study home"
        description="Like walking into a tutoring center — a few easy questions, then we tell you exactly what to do next."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <ol className="flex flex-wrap gap-2" aria-label="Setup steps">
          {STEPS.map((label, i) => (
            <li
              key={label}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium",
                step === i
                  ? "border-black/10 bg-[#111111] text-white"
                  : step > i
                    ? "border-black/5 bg-[#F7F4EE] text-black/70"
                    : "border-black/5 bg-white text-black/40"
              )}
            >
              {label}
            </li>
          ))}
        </ol>

        <SurfaceCard>
          <p className="text-sm text-black/45">
            Step {step + 1} of {STEPS.length}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">{stepTitle}</h2>

          {step === 0 && (
            <div className="mt-6 space-y-8">
              <div>
                <Label className="mb-3 block">Your grade</Label>
                <div className="flex flex-wrap gap-2">
                  {GRADES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setGrade(g);
                        setTargetScore(String(defaultTargetForGrade(g)));
                      }}
                      className={cn(
                        "rounded-full px-4 py-2.5 text-sm font-medium",
                        grade === g ? "bg-[#111111] text-white" : "bg-black/5 text-black/55"
                      )}
                    >
                      {g} grade
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-sm leading-7 text-black/55">{pathPreview.summary}</p>
              </div>
              <div>
                <Label className="mb-3 block">How are you feeling about the test?</Label>
                <div className="space-y-2">
                  {COMFORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setComfort(opt.value)}
                      className={cn(
                        "w-full rounded-2xl border p-4 text-left",
                        comfort === opt.value
                          ? "border-black/15 bg-[#111111] text-white"
                          : "border-black/5 bg-[#FCFBF8]"
                      )}
                    >
                      <p className="font-semibold">{opt.title}</p>
                      <p className={cn("mt-1 text-sm", comfort === opt.value ? "text-white/75" : "text-black/55")}>
                        {opt.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {(
                [
                  ["sat", "SAT"],
                  ["act", "ACT"],
                  ["undecided", "Not sure yet"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setTestTrack(val)}
                  className={cn(
                    "rounded-full px-4 py-2.5 text-sm font-medium",
                    testTrack === val ? "bg-[#111111] text-white" : "bg-black/5 text-black/55"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="mt-6 space-y-3">
              {EXPERIENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setExperience(opt.value);
                    if (opt.value === "never") setCurrentScore("");
                  }}
                  className={cn(
                    "w-full rounded-2xl border p-4 text-left",
                    experience === opt.value
                      ? "border-black/15 bg-[#111111] text-white"
                      : "border-black/5 bg-[#FCFBF8]"
                  )}
                >
                  <p className="font-semibold">{opt.title}</p>
                  <p className={cn("mt-1 text-sm", experience === opt.value ? "text-white/75" : "text-black/55")}>
                    {opt.description}
                  </p>
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="mt-6 space-y-6">
              {isBeginner ? (
                <div className="rounded-2xl border border-[#FF7A3D]/20 bg-[#FFF8F3] p-5">
                  <Sparkles className="h-5 w-5 text-[#FF7A3D]" />
                  <p className="mt-3 text-sm leading-7 text-black/65">{satExplainerShort()}</p>
                </div>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                {showCurrentScore && (
                  <div className="space-y-2">
                    <Label htmlFor="current_score_ui">
                      {experience === "practice" ? "Practice score (optional)" : "Current score (optional)"}
                    </Label>
                    <Input
                      id="current_score_ui"
                      type="number"
                      min={400}
                      max={1600}
                      value={currentScore}
                      onChange={(e) => setCurrentScore(e.target.value)}
                      placeholder="Leave blank if unsure"
                      className="h-12 rounded-xl border-black/10 bg-[#FCFBF8]"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="target_score_ui">Target score (optional)</Label>
                  <Input
                    id="target_score_ui"
                    type="number"
                    min={400}
                    max={1600}
                    value={targetScore}
                    onChange={(e) => setTargetScore(e.target.value)}
                    className="h-12 rounded-xl border-black/10 bg-[#FCFBF8]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>When are you thinking about testing?</Label>
                <div className="grid gap-2">
                  {TIMELINE_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTimeline(t.value)}
                      className={cn(
                        "rounded-xl border px-4 py-3 text-left text-sm",
                        timeline === t.value ? "border-black/10 bg-[#F7F4EE]" : "border-black/5 bg-white"
                      )}
                    >
                      <span className="font-medium">{t.label}</span>
                      <span className="mt-0.5 block text-black/50">{t.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="mt-6 space-y-6">
              <div className="space-y-2">
                {SIGNUP_STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSignupStatus(opt.value)}
                    className={cn(
                      "w-full rounded-xl border px-4 py-3 text-left text-sm",
                      signupStatus === opt.value ? "border-black/10 bg-[#F7F4EE]" : "border-black/5 bg-white"
                    )}
                  >
                    <span className="font-medium">{opt.title}</span>
                    <span className="mt-0.5 block text-black/50">{opt.hint}</span>
                  </button>
                ))}
              </div>
              {signupStatus === "not_signed_up" ? (
                <div className="rounded-2xl border border-black/5 bg-[#F7F4EE] p-5">
                  <p className="text-sm leading-7 text-black/70">
                    Not signed up yet? We&apos;ll help you choose a test date when you&apos;re ready.
                  </p>
                  <a
                    href={signupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-medium underline-offset-2 hover:underline"
                  >
                    View registration info <ExternalLink className="h-4 w-4" />
                  </a>
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="planned_date">Planned test date (optional)</Label>
                    <Input
                      id="planned_date"
                      type="date"
                      value={plannedDate}
                      onChange={(e) => setPlannedDate(e.target.value)}
                      className="h-12 rounded-xl border-black/10 bg-white"
                    />
                  </div>
                </div>
              ) : null}
              {signupStatus === "signed_up" ? (
                <div className="space-y-2">
                  <Label htmlFor="test_date_ui">Your test date (if you know it)</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
                    <Input
                      id="test_date_ui"
                      type="date"
                      value={testDate}
                      onChange={(e) => setTestDate(e.target.value)}
                      className="h-12 rounded-xl border-black/10 bg-[#FCFBF8] pl-10"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {step === 5 && (
            <div className="mt-6 space-y-6">
              <div>
                <Label className="mb-3 block">Study time per day</Label>
                <div className="flex flex-wrap gap-2">
                  {["20", "30", "45", "60", "90"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setStudyMinutes(m)}
                      className={cn(
                        "rounded-full px-5 py-2.5 text-sm font-medium",
                        studyMinutes === m ? "bg-[#111111] text-white" : "bg-black/5 text-black/55"
                      )}
                    >
                      {m} min
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent_email">Parent email (optional)</Label>
                <Input
                  id="parent_email"
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="parent@email.com"
                  className="h-12 rounded-xl border-black/10 bg-[#FCFBF8]"
                />
                <p className="text-xs text-black/45">We&apos;ll keep the dashboard summary parent-friendly.</p>
              </div>
            </div>
          )}

          {saveError ? (
            <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {saveError}
            </p>
          ) : null}

          <div className="mt-8 flex justify-between gap-3">
            {step > 0 ? (
              <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} className="rounded-full">
                Back
              </Button>
            ) : (
              <span />
            )}
            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                disabled={!canContinue[step]}
                onClick={() => setStep((s) => s + 1)}
                className="rounded-full bg-[#111111] px-6 text-white"
              >
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={loading} className="rounded-full bg-[#111111] px-6 text-white">
                {loading ? "Saving…" : "Go to my dashboard"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </SurfaceCard>
      </form>
    </AppShell>
  );
}
