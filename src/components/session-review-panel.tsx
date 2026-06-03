"use client";

import { useEffect, useState } from "react";
import { BookOpen, RotateCcw } from "lucide-react";
import type { SubmitAttemptResult } from "@/app/actions";
import {
  fetchSimplerExplanation,
  fetchTutoringReviewForAttempt,
  findSimilarQuestionId,
  trackLearningAction,
} from "@/app/intelligence-actions";
import { updateAttemptReview } from "@/app/actions";
import { ConceptReviewCard } from "@/components/concept-review-card";
import { Button } from "@/components/ui/button";
import type { TutoringReview } from "@/lib/question-factory";
import { cn } from "@/lib/utils";

type Props = {
  feedback: SubmitAttemptResult;
  questionId: string;
  questionText: string;
  skill: string;
  section: "math" | "reading";
  choices: string[];
  difficulty: number;
  formulaLatex?: string | null;
  commonMistakeExplanation?: string | null;
  showFormula: boolean;
  studyMode: "beginner" | "standard" | "test";
  onNext: () => void;
  nextLabel: string;
  submitting: boolean;
  passageText?: string | null;
};

export function SessionReviewPanel({
  feedback,
  questionId,
  questionText,
  skill,
  section,
  choices,
  difficulty,
  formulaLatex,
  commonMistakeExplanation,
  showFormula,
  studyMode,
  onNext,
  nextLabel,
  submitting,
  passageText,
}: Props) {
  const [review, setReview] = useState<TutoringReview | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [simplerLoading, setSimplerLoading] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [similarMsg, setSimilarMsg] = useState<string | null>(null);

  const showHints = studyMode !== "test";

  useEffect(() => {
    if (feedback.isCorrect) {
      setReview(null);
      setReviewLoading(false);
      return;
    }

    let cancelled = false;
    setReviewLoading(true);

    void fetchTutoringReviewForAttempt({
      questionId,
      question: {
        questionText,
        choices,
        correctAnswer: feedback.correctAnswer,
        explanation: feedback.explanation,
        conceptExplanation: feedback.conceptExplanation,
        formulaOrRule: feedback.formulaOrRule,
        underlyingConcept: feedback.underlyingConcept,
        commonMistakes: feedback.commonMistakes,
        commonMistakeExplanation,
        skill,
        section,
        difficulty,
        mistakeTypes: ["concept_gap"],
        estimatedTime: 90,
        passageText,
      },
      selectedAnswer: feedback.selectedAnswer,
      mistakeType: feedback.mistakeType,
    })
      .then((result) => {
        if (!cancelled) setReview(result);
      })
      .catch(() => {
        if (!cancelled) setReview(null);
      })
      .finally(() => {
        if (!cancelled) setReviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    feedback.isCorrect,
    feedback.correctAnswer,
    feedback.selectedAnswer,
    feedback.explanation,
    feedback.conceptExplanation,
    feedback.formulaOrRule,
    feedback.underlyingConcept,
    feedback.commonMistakes,
    feedback.mistakeType,
    questionId,
    questionText,
    choices,
    skill,
    section,
    difficulty,
    commonMistakeExplanation,
    passageText,
  ]);

  async function handleSimpler() {
    setSimplerLoading(true);
    const result = await fetchSimplerExplanation({
      questionText,
      explanation: review?.simpleExplanation ?? feedback.explanation,
      skill,
      section,
      attemptId: feedback.attemptId,
      questionId,
    });
    if (review) {
      setReview({ ...review, simpleExplanation: result.text });
    }
    setSimplerLoading(false);
  }

  async function handleReviewLater() {
    if (feedback.attemptId) {
      await updateAttemptReview(feedback.attemptId, { reviewLater: true });
      setSaved("Added to your dashboard — we'll remind you to review this.");
    } else {
      setSaved("We'll track this on your next session.");
    }
  }

  async function handleSimilar() {
    const result = await findSimilarQuestionId(questionId, skill, difficulty);
    if (feedback.attemptId) {
      await trackLearningAction(feedback.attemptId, { requestedSimilar: true });
    }
    setSimilarMsg(result.message);
  }

  return (
    <div
      className={cn(
        "mt-8 rounded-xl border p-5 transition-opacity duration-300",
        feedback.isCorrect ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
      )}
    >
      <p className="text-lg font-medium">
        {feedback.isCorrect ? "Correct — nice work." : "Let's walk through this together."}
      </p>

      {feedback.isCorrect ? (
        <p className="mt-3 text-sm leading-7 text-black/70">
          {review?.simpleExplanation ?? feedback.explanation}
        </p>
      ) : (
        <div className="mt-4">
          <ConceptReviewCard
            feedback={feedback}
            review={review}
            loading={reviewLoading}
            skill={skill}
            section={section}
            questionText={questionText}
            passageText={passageText}
            formulaLatex={formulaLatex}
          />
          {review?.practiceNext ? (
            <div className="mt-4 rounded-xl border border-black/8 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-black/45">
                What to practice next
              </p>
              <p className="mt-2 text-sm font-medium leading-7 text-black/85">
                {review.practiceNext}
              </p>
            </div>
          ) : null}
        </div>
      )}

      {showHints ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {!feedback.isCorrect ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full border-black/10"
              disabled={simplerLoading || reviewLoading}
              onClick={() => void handleSimpler()}
            >
              <BookOpen className="mr-1 h-3.5 w-3.5" />
              {simplerLoading ? "Loading…" : "Explain even simpler"}
            </Button>
          ) : null}
          {!feedback.isCorrect ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full border-black/10"
                onClick={() => void handleReviewLater()}
              >
                Review later
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full border-black/10"
                onClick={() => void handleSimilar()}
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                Practice similar
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      {saved ? <p className="mt-3 text-sm text-emerald-800">{saved}</p> : null}
      {similarMsg ? <p className="mt-3 text-sm text-black/60">{similarMsg}</p> : null}

      <Button
        type="button"
        onClick={onNext}
        disabled={submitting}
        className="mt-6 rounded-full bg-[#111111] px-6 text-white hover:bg-black/90"
      >
        {nextLabel}
      </Button>
    </div>
  );
}
