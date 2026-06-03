"use client";

import { BookOpen, Crosshair, Lightbulb, Target } from "lucide-react";
import { buildTutoringBreakdown } from "@/lib/solution-steps";
import type { TutoringReview } from "@/lib/question-factory";
import type { SubmitAttemptResult } from "@/app/actions";
import { PassageEvidenceBlock } from "@/components/passage-evidence-block";

type Props = {
  feedback: SubmitAttemptResult;
  review: TutoringReview | null;
  loading: boolean;
  skill: string;
  section: "math" | "reading";
  questionText: string;
  passageText?: string | null;
  formulaLatex?: string | null;
};

function ReviewSection({
  title,
  icon: Icon,
  children,
  tone = "neutral",
}: {
  title: string;
  icon: typeof Lightbulb;
  children: React.ReactNode;
  tone?: "neutral" | "warn" | "success" | "concept";
}) {
  const styles = {
    neutral: "border-[#111111]/10 bg-white",
    warn: "border-red-200/80 bg-red-50/40",
    success: "border-emerald-200/80 bg-emerald-50/40",
    concept: "border-[#FF7A3D]/20 bg-[#FFF8F3]",
  }[tone];

  return (
    <div className={`rounded-xl border p-4 ${styles}`}>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black/55">
        <Icon className="h-3.5 w-3.5 text-[#FF7A3D]" />
        {title}
      </p>
      <div className="mt-2 text-sm leading-7 text-black/85">{children}</div>
    </div>
  );
}

export function ConceptReviewCard({
  feedback,
  review,
  loading,
  skill,
  section,
  questionText,
  passageText,
  formulaLatex,
}: Props) {
  const breakdown = buildTutoringBreakdown({
    questionText,
    explanation: feedback.explanation,
    correctAnswer: feedback.correctAnswer,
    selectedAnswer: feedback.selectedAnswer,
    section,
    formulaOrRule: feedback.formulaOrRule,
    underlyingConcept: feedback.underlyingConcept,
    skill,
  });

  const whatHappened =
    review?.whyWrong ??
    `You picked "${feedback.selectedAnswer}", but the correct answer is "${feedback.correctAnswer}". ${feedback.explanation.split(/(?<=[.!?])\s+/)[0] ?? ""}`;
  const steps = review?.solutionSteps ?? breakdown.microSteps;
  const nextTime = review?.rememberNextTime ?? breakdown.rememberNextTime;
  const passageEvidence = review?.passageEvidence ?? null;

  return (
    <div className="space-y-4 text-sm leading-relaxed text-black/80">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-red-200/80 bg-red-50/40 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black/55">
            <Crosshair className="h-3.5 w-3.5 text-[#FF7A3D]" />
            Your answer
          </p>
          <p className="mt-1 font-medium text-black/90">{feedback.selectedAnswer}</p>
        </div>
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black/55">
            <Target className="h-3.5 w-3.5 text-[#FF7A3D]" />
            Correct answer
          </p>
          <p className="mt-1 font-semibold text-black/90">{feedback.correctAnswer}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-black/45">Personalizing your explanation…</p>
      ) : null}

      <ReviewSection title="What went wrong" icon={Crosshair} tone="warn">
        <p>{whatHappened}</p>
      </ReviewSection>

      {section === "reading" && passageEvidence ? (
        <PassageEvidenceBlock passageText={passageText ?? ""} evidenceText={passageEvidence.text} />
      ) : null}

      <ReviewSection title="Here's how to solve it" icon={BookOpen}>
        <ol className="mt-1 space-y-3">
          {steps.slice(0, 4).map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#111111] text-xs font-semibold text-white">
                {i + 1}
              </span>
              <span className="pt-0.5 leading-7">{step}</span>
            </li>
          ))}
        </ol>
      </ReviewSection>

      <ReviewSection title="Remember for next time" icon={Lightbulb} tone="success">
        <p className="font-medium text-emerald-950/90">{nextTime}</p>
      </ReviewSection>
    </div>
  );
}
