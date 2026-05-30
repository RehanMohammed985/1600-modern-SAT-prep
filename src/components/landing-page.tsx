"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  LineChart,
  Play,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Grade = "9th" | "10th" | "11th" | "12th";
type SessionStatus = "done" | "active" | "locked";

type SessionStep = {
  title: string;
  detail: string;
  status: SessionStatus;
};

const GRADES: Grade[] = ["9th", "10th", "11th", "12th"];

const GRADE_CONTENT: Record<
  Grade,
  { copy: string; milestone: string; milestoneDetail: string }
> = {
  "9th": {
    copy: "Build the basics early without stress.",
    milestone: "Foundations track",
    milestoneDetail: "Core math and reading skills before test pressure.",
  },
  "10th": {
    copy: "Find weak spots early and get ready for PSAT.",
    milestone: "PSAT preview plan",
    milestoneDetail: "Light timed practice and topic checks through the year.",
  },
  "11th": {
    copy: "Focused SAT practice with timing, review, and a clear weekly plan.",
    milestone: "12-week SAT plan",
    milestoneDetail: "A simple plan leading up to your next test date.",
  },
  "12th": {
    copy: "Stay on track for final tests, deadlines, and last score improvements.",
    milestone: "Final push window",
    milestoneDetail: "Short blocks tuned for retakes and application deadlines.",
  },
};

const SESSION_PLAN: SessionStep[] = [
  { title: "Warmup", detail: "Build momentum", status: "done" },
  { title: "Focus", detail: "Your weakest skill", status: "active" },
  { title: "Mixed", detail: "Varied practice", status: "locked" },
  { title: "Review", detail: "Mistakes first", status: "locked" },
];

const HERO_STATS = [
  ["No guessing", "The app picks the right practice."],
  ["No clutter", "Simple lessons, practice, and review."],
  ["Free to start", "Good prep should be easy to access."],
] as const;

const PILLARS = [
  ["01", "Students know what to do", "No more picking random topics. The app gives each student a clear plan."],
  ["02", "The timer keeps them focused", "Each session has warmup, focus, mixed practice, and review."],
  ["03", "Parents can see progress", "Parents can see what was studied, what improved, and what still needs work."],
] as const;

const NAV_LINKS = [
  { href: "#sessions", label: "Sessions" },
  { href: "#parents", label: "Parents" },
  { href: "#grades", label: "Grade paths" },
] as const;

function SiteNav() {
  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-black/5 bg-white/90 px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
      <Link href="/" className="flex items-center gap-3 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111]">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#111111] text-white" aria-hidden>
          <Sparkles className="h-4 w-4" />
          <div className="absolute inset-0 rounded-full shadow-[0_0_42px_rgba(255,255,255,0.45)]" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight">1600</span>
      </Link>
      <nav className="hidden items-center gap-9 text-[13px] text-black/50 md:flex" aria-label="Main">
        {NAV_LINKS.map(({ href, label }) => (
          <a key={href} href={href} className="transition hover:text-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#111111]">
            {label}
          </a>
        ))}
      </nav>
      <Button asChild className="h-9 rounded-full bg-[#111111] px-4 text-[13px] font-medium text-white hover:bg-black/90">
        <Link href="/login">Get access</Link>
      </Button>
    </header>
  );
}

function SessionStepCard({ title, detail, status }: SessionStep) {
  const isActive = status === "active";
  const isDone = status === "done";

  return (
    <div
      className={cn(
        "rounded-[1rem] border p-4",
        isActive ? "border-black/10 bg-[#111111] text-white" : "border-black/5 bg-white text-[#111111]"
      )}
    >
      <div
        className={cn(
          "mb-8 flex h-7 w-7 items-center justify-center rounded-full",
          isActive && "bg-white text-[#111111]",
          isDone && "bg-emerald-500/15 text-emerald-700",
          !isActive && !isDone && "bg-black/5 text-black/35"
        )}
        aria-hidden
      >
        {isDone ? <CheckCircle2 className="h-4 w-4" /> : isActive ? <Play className="h-3.5 w-3.5" /> : <ChevronRight className="h-4 w-4" />}
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className={cn("mt-1 text-xs leading-5", isActive ? "text-white/70" : "text-black/55")}>{detail}</p>
    </div>
  );
}

function SessionPreview() {
  return (
    <div id="sessions" className="relative z-10 mx-auto w-full max-w-[620px]">
      <div className="absolute -inset-8 rounded-[3.5rem] bg-[#111111]/5" aria-hidden />
      <div className="relative overflow-hidden rounded-[2rem] border border-black/10 bg-white p-2 shadow-[0_18px_55px_rgba(0,0,0,0.08)]">
        <div className="rounded-[1.7rem] border border-black/5 bg-[#FCFBF8] p-5 md:p-6">
          <div className="flex items-center justify-between border-b border-black/5 pb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-black/45">Tonight</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] md:text-3xl">Your session is ready</h2>
            </div>
            <span className="rounded-full bg-[#111111] px-3 py-1.5 text-xs font-medium text-white">Guided</span>
          </div>

          <div className="py-8 text-center">
            <p className="text-sm text-black/45">Focus block</p>
            <p className="mt-3 text-[5.8rem] font-semibold leading-none tracking-[-0.1em] md:text-[7rem]" aria-live="polite">
              18:42
            </p>
            <p className="mt-3 text-sm text-black/50">Practice questions picked for you. One block at a time.</p>
            <div
              className="mx-auto mt-7 h-1.5 max-w-sm overflow-hidden rounded-full bg-black/10"
              role="progressbar"
              aria-valuenow={64}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Session progress"
            >
              <div className="h-full w-[64%] rounded-full bg-[#111111]" />
            </div>
          </div>

          <ol className="grid list-none gap-3 p-0 md:grid-cols-4">
            {SESSION_PLAN.map((item) => (
              <li key={item.title}>
                <SessionStepCard {...item} />
              </li>
            ))}
          </ol>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_0.82fr]">
            <div className="rounded-[1.1rem] border border-black/5 bg-white p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-black/45">Study note</p>
              <p className="mt-3 text-lg leading-7 text-black/75">
                You understand the idea. You just need to slow down on evidence questions.
              </p>
            </div>
            <div id="parents" className="rounded-[1.1rem] border border-black/5 bg-white p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-black/45">For parents</p>
              <p className="mt-3 text-lg leading-7 text-black/75">3 sessions done this week. Main focus: reading speed.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GradePaths({ grade, onGradeChange }: { grade: Grade; onGradeChange: (g: Grade) => void }) {
  const { copy, milestone, milestoneDetail } = GRADE_CONTENT[grade];

  return (
    <section id="grades" className="grid gap-10 py-20 lg:grid-cols-[0.8fr_1.2fr]">
      <div>
        <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#111111] text-white" aria-hidden>
          <GraduationCap className="h-5 w-5" />
        </div>
        <h2 className="max-w-xl text-5xl font-semibold leading-[0.92] tracking-[-0.065em] md:text-7xl">
          Prep changes by grade.
        </h2>
        <p className="mt-6 max-w-md leading-7 text-black/55">
          A freshman, junior, and senior should not study the same way. 1600 adjusts the plan by grade.
        </p>
      </div>

      <div className="rounded-[2rem] border border-black/5 bg-white/75 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.06)] backdrop-blur-xl">
        <div role="tablist" aria-label="Select grade" className="flex flex-wrap gap-2">
          {GRADES.map((g) => {
            const selected = grade === g;
            return (
              <button
                key={g}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onGradeChange(g)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111]",
                  selected ? "bg-[#111111] text-white" : "bg-black/5 text-black/55 hover:bg-black/10"
                )}
              >
                {g} grade
              </button>
            );
          })}
        </div>

        <div role="tabpanel" className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.3rem] border border-black/5 bg-[#F7F4EE] p-6">
            <CalendarDays className="h-5 w-5 text-black/45" aria-hidden />
            <p className="mt-12 text-sm text-black/45">Current path</p>
            <h3 className="mt-2 text-5xl font-semibold tracking-[-0.07em]">{grade}</h3>
            <p className="mt-5 leading-7 text-black/60">{copy}</p>
          </div>
          <div className="rounded-[1.3rem] border border-black/5 bg-[#F7F4EE] p-6">
            <LineChart className="h-5 w-5 text-black/45" aria-hidden />
            <p className="mt-12 text-sm text-black/45">Next milestone</p>
            <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{milestone}</h3>
            <p className="mt-5 leading-7 text-black/60">{milestoneDetail}</p>
          </div>
          <div className="rounded-[1.3rem] border border-black/5 bg-white p-6 md:col-span-2">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div>
                <p className="text-sm text-black/45">Tonight</p>
                <h3 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">Your next study session is ready.</h3>
              </div>
              <Button asChild className="rounded-full bg-[#111111] px-6 text-white hover:bg-black/90">
                <Link href="/login">
                  <Target className="mr-2 h-4 w-4" aria-hidden /> Start
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingPage() {
  const [grade, setGrade] = useState<Grade>("11th");

  return (
    <div className="min-h-screen overflow-hidden bg-white text-[#111111] selection:bg-[#111111] selection:text-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[#111111] focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      <div className="pointer-events-none fixed inset-0 bg-[#F8F5EF]" aria-hidden>
        <div className="absolute inset-x-0 top-0 h-[24rem] bg-gradient-to-b from-white to-transparent" />
        <div className="absolute right-[-10rem] top-[10rem] h-[22rem] w-[22rem] rounded-full bg-[#F3E8D7] opacity-70" />
      </div>

      <main id="main" className="relative mx-auto w-full max-w-[1400px] px-5 py-5 md:px-8 lg:px-10">
        <SiteNav />

        <section className="relative grid min-h-[720px] items-start gap-y-20 gap-x-12 pt-14 pb-20 sm:gap-y-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-x-20 lg:gap-y-0 lg:pt-20 lg:pb-24 xl:gap-x-28">
          <div className="relative z-10 mx-auto max-w-4xl text-center lg:mx-0 lg:max-w-none lg:text-left lg:pr-6 xl:pr-10">
            <p className="mb-7 inline-flex items-center gap-3 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black/65 shadow-[0_6px_20px_rgba(0,0,0,0.04)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF7A3D]" aria-hidden />
              Built by students, not corporations
            </p>

            <h1 className="max-w-5xl text-6xl font-semibold leading-[0.94] tracking-[-0.055em] text-[#0B0B0D] md:text-8xl lg:text-[7rem]">
              SAT prep that tells you what to do next.
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-xl leading-9 text-black/65 md:text-2xl lg:mx-0">
              Students press start. The app gives them a timed study session, shows what they missed, and tells them what to study next.
            </p>

            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
              <Button asChild className="h-12 rounded-full bg-[#111111] px-7 text-base font-semibold text-white shadow-[0_18px_60px_rgba(0,0,0,0.18)] hover:bg-black/90">
                <Link href="/login">
                  Start studying <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-full border-black/10 bg-white/60 px-7 text-base text-black hover:bg-black/5 hover:text-black"
              >
                <a href="#sessions">
                  <Play className="mr-2 h-4 w-4" aria-hidden /> See how it works
                </a>
              </Button>
            </div>

            <ul className="mt-14 grid max-w-2xl list-none grid-cols-1 gap-6 p-0 text-left sm:grid-cols-3">
              {HERO_STATS.map(([title, text]) => (
                <li key={title} className="border-l border-black/10 pl-4">
                  <p className="text-sm font-medium text-black/85">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-black/50">{text}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 mt-4 lg:mt-8 lg:pl-4 xl:pl-8">
            <SessionPreview />
          </div>
        </section>

        <section className="grid gap-8 border-y border-black/5 py-16 md:grid-cols-3" aria-label="How 1600 works">
          {PILLARS.map(([num, title, text]) => (
            <article key={num}>
              <p className="text-sm text-black/30">{num}</p>
              <h3 className="mt-5 max-w-xs text-3xl font-semibold leading-tight tracking-[-0.045em]">{title}</h3>
              <p className="mt-5 max-w-sm leading-7 text-black/55">{text}</p>
            </article>
          ))}
        </section>

        <GradePaths grade={grade} onGradeChange={setGrade} />
      </main>
    </div>
  );
}
