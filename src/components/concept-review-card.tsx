"use client";

import { BookMarked, HelpCircle, Lightbulb, ListOrdered, Target } from "lucide-react";
import { FormulaVisualization } from "@/components/formula-visualization";
import { ConceptVisual } from "@/lib/concept-visuals";
import { buildTutoringBreakdown } from "@/lib/solution-steps";
import type { TutoringReview } from "@/lib/question-factory";
import type { SubmitAttemptResult } from "@/app/actions";

type Props = {
  feedback: SubmitAttemptResult;
  review: TutoringReview | null;
  loading: boolean;
  skill: string;
  section: "math" | "reading";
  questionText: string;
  formulaLatex?: string | null;
};

function ReviewSection({
  title,
  icon: Icon,
  children,
  tone = "neutral",
}: {
  title: string;
  icon: typeof HelpCircle;
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

  const whyWrong = review?.whyWrong ?? breakdown.whyWrong;
  const commonMistake = review?.commonMistake ?? breakdown.commonMistake;
  const concept =
    review?.underlyingConcept ??
    feedback.underlyingConcept ??
    feedback.conceptExplanation ??
    "This question tests one core idea. Learn the rule below, then try the follow-up questions.";
  const rule = review?.formulaOrRule ?? feedback.formulaOrRule;
  const remember = review?.rememberNextTime ?? breakdown.rememberNextTime;
  const steps = review?.solutionSteps ?? breakdown.microSteps;
  const workedExample = review?.workedExample ?? breakdown.workedExample;

  return (
    <div className="space-y-4 text-sm leading-relaxed text-black/80">
      <div className="grid gap-3 sm:grid-cols-2">
        <ReviewSection title="Your answer" icon={Target} tone="warn">
          <p className="font-medium text-black/90">{feedback.selectedAnswer}</p>
        </ReviewSection>
        <ReviewSection title="Correct answer" icon={Target} tone="success">
          <p className="font-semibold text-black/90">{feedback.correctAnswer}</p>
        </ReviewSection>
      </div>

      {loading ? (
        <p className="mt-2 text-xs text-black/45">Personalizing your explanation…</p>
      ) : null}
      <ReviewSection title="Why your answer was wrong" icon={HelpCircle} tone="warn">
        <p>{whyWrong}</p>
      </ReviewSection>

      <ReviewSection title="Why students commonly miss this" icon={Lightbulb}>
        <p>{commonMistake}</p>
      </ReviewSection>

      <ReviewSection title="Underlying concept" icon={BookMarked} tone="concept">
        <p>{concept}</p>
      </ReviewSection>

      {rule ? (
        <FormulaVisualization formula={rule} latex={formulaLatex} label="Formula or rule" />
      ) : null}

      <ConceptVisual skill={skill} section={section} />

      <ReviewSection title="Step-by-step breakdown" icon={ListOrdered}>
        <ol className="mt-1 space-y-3">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#111111] text-xs font-semibold text-white">
                {i + 1}
              </span>
              <span className="pt-0.5 leading-7">{step}</span>
            </li>
          ))}
        </ol>
      </ReviewSection>

      {workedExample.length > 1 ? (
        <ReviewSection title="Worked example" icon={ListOrdered}>
          <ul className="space-y-2">
            {workedExample.map((line, i) => (
              <li key={i} className="leading-7">
                {line}
              </li>
            ))}
          </ul>
        </ReviewSection>
      ) : null}

      <ReviewSection title="What to remember next time" icon={BookMarked} tone="success">
        <p className="font-medium text-emerald-950/90">{remember}</p>
      </ReviewSection>
    </div>
  );
}
