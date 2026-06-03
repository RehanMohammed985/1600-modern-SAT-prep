"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell, PageHeader, SurfaceCard } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Brain, TrendingUp, Target, AlertTriangle, Clock, CheckCircle, BarChart3, Sparkles } from "lucide-react";
import type { StudentIntelligence } from "@/lib/intelligence/integration";
import type { ScorePrediction } from "@/lib/intelligence/score-prediction";
import type { ReviewCard } from "@/lib/intelligence/spaced-repetition";
import { formatSkillTag } from "@/lib/utils";
import { SKILL_LABELS } from "@/lib/types";

function skillLabel(tag: string) {
  return SKILL_LABELS[tag] ?? formatSkillTag(tag);
}

type ProgressData = {
  intelligence: StudentIntelligence | null;
  prediction: ScorePrediction | null;
  goalLabel: string;
  goalDays: number | null;
  history: { date: string; predicted: number; math: number; readingWriting: number }[];
};

type SyncStatus = "idle" | "syncing" | "done" | "error";

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [activeTab, setActiveTab] = useState<"overview" | "skills" | "mistakes" | "plan">("overview");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [intelRes, historyRes] = await Promise.all([
        fetch("/api/intelligence"),
        fetch("/api/intelligence/history"),
      ]);
      const intel = await intelRes.json();
      const history = await historyRes.json();
      setData({
        intelligence: intel.intelligence ?? null,
        prediction: intel.prediction ?? null,
        goalLabel: intel.goalLabel ?? "Loading…",
        goalDays: intel.goalDays ?? null,
        history: history.history ?? [],
      });
    } catch {
      // Will show fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleSync() {
    setSyncStatus("syncing");
    try {
      const res = await fetch("/api/intelligence/sync", { method: "POST" });
      const json = await res.json();
      setSyncStatus(json.error ? "error" : "done");
      if (!json.error) setTimeout(() => { void load(); }, 500);
    } catch {
      setSyncStatus("error");
    }
    setTimeout(() => setSyncStatus("idle"), 3000);
  }

  if (loading) {
    return (
      <AppShell maxWidth="xl" homeHref="/dashboard">
        <div className="flex items-center justify-center py-20">
          <p className="text-black/45">Loading your intelligence data…</p>
        </div>
      </AppShell>
    );
  }

  const intel = data?.intelligence;
  const pred = data?.prediction;

  return (
    <AppShell maxWidth="xl" homeHref="/dashboard">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-black/45 hover:text-black">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <div className="flex items-center gap-3">
          <span className={`text-xs ${syncStatus === "done" ? "text-emerald-600" : syncStatus === "error" ? "text-red-600" : "text-black/45"}`}>
            {syncStatus === "syncing" ? "Syncing…" : syncStatus === "done" ? "Synced!" : syncStatus === "error" ? "Sync failed" : ""}
          </span>
          <Button
            onClick={handleSync}
            disabled={syncStatus === "syncing"}
            variant="outline"
            className="rounded-full border-black/10 text-xs"
          >
            Sync data
          </Button>
        </div>
      </div>

      <PageHeader
        eyebrow="Your intelligence dashboard"
        title="Progress & insights"
        description="Bayesian Knowledge Tracing, score predictions, mistake patterns, and your weekly plan."
      />

      {pred ? (
        <SurfaceCard className="mb-8 border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Target className="h-10 w-10 text-emerald-600" />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-black/45">Predicted score</p>
                <p className="text-3xl font-semibold">{pred.current}</p>
                <div className="flex gap-4 mt-1 text-xs text-black/45">
                  <span>Math: {pred.breakdown.math}</span>
                  <span>Reading/Writing: {pred.breakdown.readingWriting}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-black/55">{data?.goalLabel}</p>
              {data?.goalDays !== null && data?.goalDays !== undefined ? (
                <p className="text-2xl font-semibold mt-1">{data.goalDays} days to target</p>
              ) : null}
              <div className="mt-2 flex items-center justify-end gap-2">
                <span className="text-xs text-black/45">Projected:</span>
                <span className="font-medium">{pred.projected}</span>
                <span className="text-xs text-emerald-600">+{pred.projected - pred.current}</span>
              </div>
            </div>
          </div>
        </SurfaceCard>
      ) : null}

      <div className="mb-6 flex gap-2 overflow-x-auto">
        {(["overview", "skills", "mistakes", "plan"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-4 py-2 text-sm capitalize whitespace-nowrap ${
              activeTab === tab ? "bg-[#111111] text-white" : "bg-black/5 text-black/55"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SurfaceCard>
            <Brain className="h-4 w-4 text-black/45" />
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-black/45">Skills tracked</p>
            <p className="mt-2 text-4xl font-semibold">{intel?.skillStates.length ?? 0}</p>
          </SurfaceCard>
          <SurfaceCard>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-black/45">Mastered</p>
            <p className="mt-2 text-4xl font-semibold">
              {intel?.skillStates.filter((s) => s.pMastered >= 0.78).length ?? 0}
            </p>
          </SurfaceCard>
          <SurfaceCard className="border-amber-100 bg-amber-50/30">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-black/45">Weak skills</p>
            <p className="mt-2 text-4xl font-semibold">
              {intel?.skillStates.filter((s) => s.pMastered < 0.45).length ?? 0}
            </p>
          </SurfaceCard>
          <SurfaceCard>
            <BarChart3 className="h-4 w-4 text-black/45" />
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-black/45">Mistake patterns</p>
            <p className="mt-2 text-4xl font-semibold">{intel?.mistakePatterns.length ?? 0}</p>
          </SurfaceCard>
        </div>
      ) : null}

      {activeTab === "skills" ? (
        <div className="space-y-4">
          <SurfaceCard>
            <h2 className="text-xl font-semibold">Skill mastery (BKT)</h2>
            <p className="mt-1 text-sm text-black/55">
              Bayesian Knowledge Tracing estimates how likely you&apos;ve mastered each skill.
            </p>
            <div className="mt-6 space-y-3">
              {(intel?.skillStates ?? []).length === 0 ? (
                <p className="text-sm text-black/45">Complete some sessions to see skill data.</p>
              ) : (
                (intel?.skillStates ?? [])
                  .sort((a, b) => a.pMastered - b.pMastered)
                  .map((s) => (
                    <div key={s.skillTag} className="rounded-xl border border-black/5 bg-[#F7F4EE] px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{skillLabel(s.skillTag)}</span>
                        <span className="text-xs text-black/45">
                          {s.opportunities} attempts · P(L)={s.pLearn.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress
                          value={Math.round(s.pMastered * 100)}
                          className="flex-1 h-2 bg-black/10 [&>div]:bg-[#111111]"
                        />
                        <span className="text-sm font-medium tabular-nums w-12 text-right">
                          {Math.round(s.pMastered * 100)}%
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-black/45">
                        {s.pMastered >= 0.78 ? "Mastered" : s.pMastered >= 0.55 ? "Proficient" : s.pMastered >= 0.35 ? "Developing" : "Novice"}
                        {s.consecutiveCorrect >= 3 ? ` · ${s.consecutiveCorrect} correct in a row` : ""}
                      </p>
                    </div>
                  ))
              )}
            </div>
          </SurfaceCard>
        </div>
      ) : null}

      {activeTab === "mistakes" ? (
        <div className="grid gap-6 md:grid-cols-2">
          <SurfaceCard>
            <h2 className="text-xl font-semibold">Mistake patterns</h2>
            <p className="mt-1 text-sm text-black/55">Recurring error types by skill.</p>
            {(intel?.mistakePatterns ?? []).length === 0 ? (
              <p className="mt-6 text-sm text-black/45">No mistakes logged yet.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {(intel?.mistakePatterns ?? []).slice(0, 8).map((p) => (
                  <li key={`${p.skillTag}-${p.mistakeType}`} className="rounded-xl border border-black/5 px-4 py-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{skillLabel(p.skillTag)}</span>
                      <span className="text-black/45">{p.mistakeType.replace(/_/g, " ")}</span>
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-black/45">
                      <span>{p.count}x</span>
                      <span>{p.frequency}</span>
                      {p.recurring ? <span className="text-amber-600">Recurring</span> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SurfaceCard>
          <SurfaceCard>
            <h2 className="text-xl font-semibold">Mistake clusters</h2>
            <p className="mt-1 text-sm text-black/55">Grouped patterns across skills.</p>
            {(intel?.mistakeClusters ?? []).length === 0 ? (
              <p className="mt-6 text-sm text-black/45">No clusters detected yet.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {(intel?.mistakeClusters ?? []).map((c, i) => (
                  <li key={i} className="rounded-xl border border-amber-100 bg-amber-50/30 px-4 py-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{c.label}</span>
                      <span className="text-amber-700">{c.count}x</span>
                    </div>
                    <p className="mt-1 text-xs text-black/55">{c.recommendation}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {c.skills.map((s) => (
                        <span key={s} className="rounded-full bg-white px-2 py-0.5 text-xs">{skillLabel(s)}</span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SurfaceCard>
          <SurfaceCard className="md:col-span-2">
            <h2 className="text-xl font-semibold">Spaced repetition schedule</h2>
            <p className="mt-1 text-sm text-black/55">Skills due for review based on your forgetting curve.</p>
            {(intel?.overdueCards ?? []).length === 0 ? (
              <p className="mt-6 text-sm text-black/45">No skills due for review. Come back after your next session.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {(intel?.overdueCards ?? []).map((c) => (
                  <li key={c.skillTag} className="flex justify-between rounded-xl border border-amber-100 bg-amber-50/30 px-4 py-3 text-sm">
                    <span className="font-medium">{skillLabel(c.skillTag)}</span>
                    <div className="flex gap-4 text-xs text-black/55">
                      <span>Ease: {c.easeFactor.toFixed(1)}</span>
                      <span>Interval: {c.intervalDays}d</span>
                      <span>Reps: {c.repetitions}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SurfaceCard>
        </div>
      ) : null}

      {activeTab === "plan" ? (
        <div className="space-y-4">
          {intel?.weeklyPlan ? (
            <>
              <SurfaceCard className="bg-gradient-to-br from-[#FCFBF8] to-white">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-[#FF7A3D]" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-black/45">Weekly plan</p>
                    <p className="mt-1 text-sm text-black/55">
                      {intel.weeklyPlan.totalSessions} sessions · ~{intel.weeklyPlan.totalMinutes} min total
                      · {intel.weeklyPlan.predictedScoreBefore} → {intel.weeklyPlan.predictedScoreAfter}
                    </p>
                  </div>
                </div>
              </SurfaceCard>
              <div className="grid gap-3 md:grid-cols-7">
                {intel.weeklyPlan.days.map((day) => (
                  <SurfaceCard key={day.day} className="border-black/5">
                    <p className="text-xs font-medium uppercase tracking-wider text-black/45">{day.day}</p>
                    <p className="mt-2 text-sm font-medium">{skillLabel(day.focusSkill)}</p>
                    <p className="text-xs text-black/45">{day.sessionMinutes} min</p>
                    <p className="mt-1 text-xs text-black/55">{day.rationale}</p>
                    <p className="mt-2 text-xs text-emerald-600">+{day.predictedGain} pts</p>
                    {day.reviewSkills.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {day.reviewSkills.map((rs) => (
                          <span key={rs} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                            Review: {skillLabel(rs)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </SurfaceCard>
                ))}
              </div>
              <SurfaceCard>
                <h3 className="text-sm font-medium">Focus distribution</h3>
                <div className="mt-3 space-y-2">
                  {(intel!.weeklyPlan!.focusDistribution).map((f) => (
                    <div key={f.skillTag} className="flex items-center gap-3">
                      <span className="w-32 text-sm">{skillLabel(f.skillTag)}</span>
                      <Progress value={(f.sessions / Math.max(...intel!.weeklyPlan!.focusDistribution.map((x) => x.sessions))) * 100} className="flex-1 h-2 bg-black/10 [&>div]:bg-[#111111]" />
                      <span className="text-xs text-black/45 w-8 text-right">{f.sessions}x</span>
                    </div>
                  ))}
                </div>
              </SurfaceCard>
            </>
          ) : (
            <SurfaceCard>
              <p className="text-sm text-black/55">Complete at least one session to generate a weekly plan.</p>
            </SurfaceCard>
          )}
        </div>
      ) : null}

      {data?.history && data.history.length > 0 ? (
        <SurfaceCard className="mt-8">
          <h2 className="text-xl font-semibold">Score history</h2>
          <p className="mt-1 text-sm text-black/55">How your predicted score has changed over time.</p>
          <div className="mt-4 space-y-2">
            {data.history.slice(-14).map((h) => (
              <div key={h.date} className="flex items-center gap-4 rounded-xl border border-black/5 px-4 py-2 text-sm">
                <span className="w-24 text-black/45">{new Date(h.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                <span className="font-medium w-16">{h.predicted}</span>
                <Progress value={(h.predicted / 1600) * 100} className="flex-1 h-2 bg-black/10 [&>div]:bg-[#111111]" />
                <span className="text-xs text-black/45 w-20 text-right">M: {h.math} RW: {h.readingWriting}</span>
              </div>
            ))}
          </div>
        </SurfaceCard>
      ) : null}
    </AppShell>
  );
}
