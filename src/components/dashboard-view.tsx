"use client";

import Link from "next/link";
import { AlertCircle, ExternalLink, Flame, Sparkles, Target, TrendingUp, Timer } from "lucide-react";
import { StartSessionButton } from "@/components/start-session-button";
import { AppShell, PageHeader, SurfaceCard } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  dashboardDescription,
  dashboardTitle,
  parentSummary,
  progressLabel,
  signupGuidance,
  signupUrl,
  timelineLabel,
} from "@/lib/student-path";
import type { Profile, RecentMistake, SessionPhase, SkillIntelligence } from "@/lib/types";
import type { ReviewRecommendation } from "@/lib/intelligence/insights";
import { MISTAKE_TYPE_LABELS, PHASE_LABELS, SKILL_LABELS } from "@/lib/types";
import { cn, formatSkillTag } from "@/lib/utils";

type DashboardViewProps = {
  profile: Profile;
  weakAreas: { skill_tag: string; accuracy: number; attempts: number; skillScore?: number }[];
  improvingSkills: { skill_tag: string; accuracy: number; attempts: number; skillScore?: number }[];
  skillInsights?: SkillIntelligence[];
  conceptGaps?: { skill_tag: string; label: string; skillScore: number }[];
  reviewRecommendations?: ReviewRecommendation[];
  timingIssues: boolean;
  recentMistakes: RecentMistake[];
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
  learningPhaseLabel?: string | null;
};

function formatSessionDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function skillLabel(tag: string) {
  return SKILL_LABELS[tag] ?? formatSkillTag(tag);
}

export function DashboardView({
  profile,
  weakAreas,
  improvingSkills,
  skillInsights = [],
  conceptGaps = [],
  reviewRecommendations = [],
  timingIssues,
  recentMistakes,
  recentSessions,
  streak,
  estimatedProgress,
  gradePathProgress,
  recommendedSessionLabel,
  nextStudy,
  learningPhaseLabel,
}: DashboardViewProps) {
  const progress = progressLabel(profile);
  const showSignupHelp =
    profile.test_signup_status === "not_signed_up" ||
    profile.test_signup_status === "not_sure" ||
    profile.registered_for_test === false;

  return (
    <AppShell maxWidth="xl" homeHref="/dashboard">
      <SurfaceCard className="mb-10 border-[#111111]/10 bg-gradient-to-br from-[#FCFBF8] to-white p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-black/45">Your next step</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Start today&apos;s session</h1>
            <p className="mt-2 max-w-lg text-sm leading-7 text-black/60">{nextStudy}</p>
            <p className="mt-1 text-xs text-black/45">{recommendedSessionLabel}</p>
            {learningPhaseLabel ? (
              <p className="mt-2 text-xs font-medium text-[#FF7A3D]/90">{learningPhaseLabel}</p>
            ) : null}
          </div>
          <StartSessionButton />
        </div>
      </SurfaceCard>

      <PageHeader
        eyebrow={profile.grade ? `${profile.grade} grade` : "Your home base"}
        title={dashboardTitle(profile)}
        description={dashboardDescription(profile)}
      />

      {profile.study_plan_label ? (
        <SurfaceCard className="mb-8 border-[#FF7A3D]/15 bg-gradient-to-br from-[#FFF8F3] to-white">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-1 h-5 w-5 shrink-0 text-[#FF7A3D]" />
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-black/45">Today&apos;s plan</p>
              <p className="mt-2 text-lg font-medium leading-relaxed text-black/85">
                {profile.study_plan_label}
              </p>
              {profile.grade_path_label ? (
                <p className="mt-2 text-sm text-black/55">{profile.grade_path_label}</p>
              ) : null}
              <p className="mt-1 text-sm text-black/45">{timelineLabel(profile.test_timeline)}</p>
            </div>
          </div>
        </SurfaceCard>
      ) : null}

      {showSignupHelp ? (
        <SurfaceCard className="mb-8 bg-[#F7F4EE]">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-black/45" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-black/45">Test signup</p>
              <p className="mt-3 text-base leading-7 text-black/75">
                {signupGuidance(profile.test_track, profile.test_signup_status)}
              </p>
              <a
                href={signupUrl(profile.test_track)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#111111] px-5 py-2.5 text-sm font-medium text-white hover:bg-black/90"
              >
                View registration info <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </SurfaceCard>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SurfaceCard>
          <Flame className="h-4 w-4 text-black/45" />
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-black/45">Streak</p>
          <p className="mt-2 text-4xl font-semibold">{streak}</p>
          <p className="text-sm text-black/55">{streak === 1 ? "day" : "days"} in a row</p>
        </SurfaceCard>
        <SurfaceCard>
          <TrendingUp className="h-4 w-4 text-black/45" />
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-black/45">{progress.title}</p>
          <p className="mt-2 text-4xl font-semibold">{estimatedProgress}%</p>
          <Progress value={estimatedProgress} className="mt-3 h-1.5 bg-black/10 [&>div]:bg-[#111111]" />
        </SurfaceCard>
        <SurfaceCard>
          <Target className="h-4 w-4 text-black/45" />
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-black/45">Grade path</p>
          <p className="mt-2 text-4xl font-semibold">{gradePathProgress}%</p>
          <p className="text-sm text-black/55">Sessions toward your path</p>
        </SurfaceCard>
        <SurfaceCard className={timingIssues ? "border-amber-200 bg-amber-50/50" : ""}>
          <Timer className="h-4 w-4 text-black/45" />
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-black/45">Timing</p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-black/85">
            {timingIssues ? "Taking extra time on some questions — we'll work on pace." : "Pace looks steady so far."}
          </p>
        </SurfaceCard>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <SurfaceCard>
          <h2 className="text-xl font-semibold">Skills to work on</h2>
          <p className="mt-1 text-sm text-black/55">Where misses cluster — we focus here first.</p>
          {weakAreas.length === 0 ? (
            <p className="mt-6 rounded-xl bg-[#F7F4EE] p-4 text-sm text-black/55">
              Start a session. After a few questions we&apos;ll show your weak spots here.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {weakAreas.map((area) => (
                <li
                  key={area.skill_tag}
                  className="flex justify-between rounded-xl border border-black/5 bg-[#F7F4EE] px-4 py-3"
                >
                  <span className="font-medium">{skillLabel(area.skill_tag)}</span>
                  <Badge variant="outline" className="rounded-full">
                    {area.skillScore != null
                      ? `Score ${Math.round(area.skillScore * 100)}`
                      : `${Math.round(area.accuracy * 100)}%`}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </SurfaceCard>

        <SurfaceCard>
          <h2 className="text-xl font-semibold">Skills improving</h2>
          <p className="mt-1 text-sm text-black/55">You&apos;re getting these right more often.</p>
          {improvingSkills.length === 0 ? (
            <p className="mt-6 rounded-xl bg-[#F7F4EE] p-4 text-sm text-black/55">
              Keep practicing — wins will show up here.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {improvingSkills.map((s) => (
                <li
                  key={s.skill_tag}
                  className="flex justify-between rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3"
                >
                  <span className="font-medium">{skillLabel(s.skill_tag)}</span>
                  <span className="text-sm text-emerald-700">{Math.round(s.accuracy * 100)}%</span>
                </li>
              ))}
            </ul>
          )}
        </SurfaceCard>
      </div>

      {conceptGaps.length > 0 || reviewRecommendations.length > 0 ? (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {conceptGaps.length > 0 ? (
            <SurfaceCard className="border-amber-100 bg-amber-50/30">
              <h2 className="text-xl font-semibold">Concept gaps</h2>
              <p className="mt-1 text-sm text-black/55">We&apos;ll explain these more slowly in your next session.</p>
              <ul className="mt-4 space-y-2">
                {conceptGaps.map((g) => (
                  <li key={g.skill_tag} className="rounded-xl bg-white/80 px-4 py-3 text-sm">
                    <span className="font-medium">{g.label}</span>
                    <span className="mt-1 block text-black/50">
                      Skill score {Math.round(g.skillScore * 100)} — needs concept review
                    </span>
                  </li>
                ))}
              </ul>
            </SurfaceCard>
          ) : null}
          {reviewRecommendations.length > 0 ? (
            <SurfaceCard>
              <h2 className="text-xl font-semibold">Recommended review</h2>
              <ul className="mt-4 space-y-2">
                {reviewRecommendations.map((r) => (
                  <li key={r.skill} className="rounded-xl border border-black/5 px-4 py-3 text-sm">
                    <span className="font-medium">{r.label}</span>
                    <p className="mt-1 text-black/55">{r.reason}</p>
                  </li>
                ))}
              </ul>
            </SurfaceCard>
          ) : null}
        </div>
      ) : null}

      {skillInsights.length > 0 ? (
        <SurfaceCard className="mt-8">
          <h2 className="text-xl font-semibold">Skill scores</h2>
          <p className="mt-1 text-sm text-black/55">
            Blends accuracy, speed, consistency, confidence, and retention.
          </p>
          <ul className="mt-4 space-y-2">
            {skillInsights.slice(0, 6).map((s) => (
              <li
                key={s.skill_tag}
                className="flex items-center justify-between rounded-xl bg-[#F7F4EE] px-4 py-3 text-sm"
              >
                <span className="font-medium">{skillLabel(s.skill_tag)}</span>
                <span className="tabular-nums text-black/70">
                  {Math.round(s.skillScore * 100)}
                  {s.hasTimingIssue ? " · timing" : ""}
                  {s.hasConceptGap ? " · concepts" : ""}
                </span>
              </li>
            ))}
          </ul>
        </SurfaceCard>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <SurfaceCard>
          <h2 className="text-xl font-semibold">Recent mistakes</h2>
          <p className="mt-1 text-sm text-black/55">What to review from your last sessions.</p>
          {recentMistakes.length === 0 ? (
            <p className="mt-6 text-sm text-black/55">No misses logged yet — that&apos;s okay on day one.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {recentMistakes.map((m) => (
                <li key={`${m.questionId}-${m.answeredAt}`} className="rounded-xl border border-black/5 px-4 py-3 text-sm">
                  <span className="font-medium">{skillLabel(m.skill)}</span>
                  {m.mistakeType ? (
                    <span className="mt-1 block text-black/50">
                      {MISTAKE_TYPE_LABELS[m.mistakeType]}
                      {m.recovered ? " · recovered in Mistake Arena" : ""}
                      {m.reviewLater && !m.recovered ? " · review later" : ""}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </SurfaceCard>

        <SurfaceCard>
          <h2 className="text-xl font-semibold">Recent sessions</h2>
          {recentSessions.length === 0 ? (
            <p className="mt-6 text-sm text-black/55">
              No sessions yet — about {profile.study_minutes_per_day ?? 30} minutes for the first one.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {recentSessions.map((session) => (
                <li key={session.id}>
                  <Link
                    href={
                      session.status === "in_progress"
                        ? `/session?id=${session.id}`
                        : "/dashboard"
                    }
                    className={cn(
                      "flex justify-between rounded-xl border px-4 py-3 transition",
                      session.status === "in_progress"
                        ? "border-black/10 bg-[#111111] text-white"
                        : "border-black/5 bg-white hover:bg-[#F7F4EE]"
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium">{formatSessionDate(session.started_at)}</p>
                      <p
                        className={cn(
                          "text-xs",
                          session.status === "in_progress" ? "text-white/70" : "text-black/45"
                        )}
                      >
                        {session.status === "completed"
                          ? "Done"
                          : `In progress · ${PHASE_LABELS[session.current_phase] ?? session.current_phase}`}
                      </p>
                    </div>
                    {session.status === "in_progress" ? (
                      <span className="text-xs font-medium">Resume →</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SurfaceCard>
      </div>

      <SurfaceCard className="mt-8 bg-[#F7F4EE]">
        <p className="text-xs uppercase tracking-[0.2em] text-black/45">For parents</p>
        <p className="mt-3 text-lg leading-7 text-black/75">{parentSummary(profile)}</p>
      </SurfaceCard>
    </AppShell>
  );
}
