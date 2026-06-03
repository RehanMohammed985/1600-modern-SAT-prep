"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Shield, Target } from "lucide-react";
import type { SubmitAttemptResult } from "@/app/actions";
import { submitAttempt } from "@/app/actions";
import { completeMistakeArena } from "@/app/mistake-arena-actions";
import { fetchTutoringReviewForAttempt } from "@/app/intelligence-actions";
import { ConceptReviewCard } from "@/components/concept-review-card";
import { Button } from "@/components/ui/button";
import { type Question } from "@/lib/types";
import type { TutoringReview } from "@/lib/question-factory";
import { cn } from "@/lib/utils";

type Props = {
  sessionId: string;
  parentAttemptId?: string;
  feedback: SubmitAttemptResult;
  sourceQuestion: Question;
  followUpQuestions: Question[];
  studyMode: "beginner" | "standard" | "test";
  onComplete: (recovered: boolean) => void;
};

export function MistakeArena({
  sessionId,
  parentAttemptId,
  feedback,
  sourceQuestion,
  followUpQuestions,
  studyMode,
  onComplete,
}: Props) {
  const [review, setReview] = useState<TutoringReview | null>(null);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [step, setStep] = useState<"learn" | "practice">("learn");
  const [followUpIndex, setFollowUpIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [followUpFeedback, setFollowUpFeedback] = useState<SubmitAttemptResult | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const followUp = followUpQuestions[followUpIndex];

  useEffect(() => {
    setReviewLoading(true);
    void fetchTutoringReviewForAttempt({
      questionId: sourceQuestion.id,
      question: {
        questionText: sourceQuestion.questionText,
        choices: sourceQuestion.choices,
        correctAnswer: feedback.correctAnswer,
        explanation: feedback.explanation,
        conceptExplanation: feedback.conceptExplanation,
        formulaOrRule: feedback.formulaOrRule,
        underlyingConcept: feedback.underlyingConcept,
        commonMistakes: feedback.commonMistakes,
        commonMistakeExplanation: sourceQuestion.commonMistakeExplanation,
        skill: sourceQuestion.skill,
        section: sourceQuestion.section,
        difficulty: sourceQuestion.difficulty,
        mistakeTypes: sourceQuestion.mistakeTypes,
        estimatedTime: sourceQuestion.estimatedTime,
        passageText: sourceQuestion.passage?.passageText ?? null,
      },
      selectedAnswer: feedback.selectedAnswer,
      mistakeType: feedback.mistakeType,
    })
      .then(setReview)
      .finally(() => setReviewLoading(false));
  }, [sourceQuestion, feedback]);

  async function handleFollowUpSubmit() {
    if (!selected || !followUp || submitting) return;
    setSubmitting(true);
    try {
      const result = await submitAttempt(
        sessionId,
        followUp.id,
        selected,
        followUp.estimatedTime,
        {
          correctAnswer: followUp.correctAnswer,
          explanation: followUp.explanation,
          conceptExplanation: followUp.conceptExplanation,
          formulaOrRule: followUp.formulaOrRule,
          underlyingConcept: followUp.underlyingConcept,
          commonMistakes: followUp.commonMistakes,
          section: followUp.section,
          skill: followUp.skill,
          estimatedTime: followUp.estimatedTime,
          mistakeTypes: followUp.mistakeTypes,
        },
        "medium"
      );
      setFollowUpFeedback(result);
      if (result.isCorrect) setCorrectCount((c) => c + 1);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFollowUpNext() {
    if (followUpIndex < followUpQuestions.length - 1) {
      setFollowUpIndex((i) => i + 1);
      setSelected(null);
      setFollowUpFeedback(null);
      return;
    }

    setFinishing(true);
    const finalCorrect =
      correctCount + (followUpFeedback?.isCorrect ? 0 : 0);
    const recovered = finalCorrect >= followUpQuestions.length;
    if (parentAttemptId) {
      await completeMistakeArena({
        parentAttemptId,
        recovered,
        followUpCorrect: finalCorrect,
        followUpTotal: followUpQuestions.length,
      });
    }
    onComplete(recovered);
  }

  if (step === "learn") {
    return (
      <div className="mt-8 rounded-xl border border-amber-300/60 bg-gradient-to-br from-amber-50 to-[#FFF8F0] p-5">
        <div className="flex items-center gap-2 text-amber-900">
          <Shield className="h-5 w-5" />
          <p className="text-lg font-semibold">Mistake Arena</p>
        </div>
        <p className="mt-1 text-sm text-black/55">
          Same concept as the question you missed — work through the steps above, then try these two
          practice problems.
        </p>

        <ConceptReviewCard
          feedback={feedback}
          review={review}
          loading={reviewLoading}
          skill={sourceQuestion.skill}
          section={sourceQuestion.section}
          questionText={sourceQuestion.questionText}
          formulaLatex={sourceQuestion.formulaLatex}
          passageText={sourceQuestion.passage?.passageText ?? null}
        />

        <Button
          type="button"
          onClick={() =>
            followUpQuestions.length ? setStep("practice") : onComplete(false)
          }
          disabled={reviewLoading}
          className="mt-6 rounded-full bg-[#111111] px-6 text-white hover:bg-black/90"
        >
          <Target className="mr-2 h-4 w-4" />
          {followUpQuestions.length
            ? `Start follow-up questions (${followUpQuestions.length})`
            : "Continue session"}
        </Button>
      </div>
    );
  }

  if (!followUp) {
    return (
      <div className="mt-8 rounded-xl border border-black/10 bg-[#FCFBF8] p-5 text-sm">
        No follow-up questions available — we&apos;ll schedule more review later.
        <Button type="button" className="mt-4 rounded-full" onClick={() => onComplete(false)}>
          Continue
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-xl border border-[#111111]/15 bg-[#FCFBF8] p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-black/45">
        Same skill · Follow-up {followUpIndex + 1} of {followUpQuestions.length}
      </p>
      <p className="mt-1 text-xs text-black/50">
        This practices the same idea — not a random topic.
      </p>
      <h3 className="mt-3 text-lg font-medium leading-relaxed">{followUp.questionText}</h3>

      {!followUpFeedback ? (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {followUp.choices.map((choice) => (
              <button
                key={choice}
                type="button"
                onClick={() => setSelected(choice)}
                className={cn(
                  "rounded-xl border px-4 py-4 text-left text-sm leading-6 transition",
                  selected === choice
                    ? "border-[#111111] bg-[#111111] text-white"
                    : "border-black/10 bg-white hover:border-black/20"
                )}
              >
                {choice}
              </button>
            ))}
          </div>
          <Button
            type="button"
            disabled={!selected || submitting}
            onClick={() => void handleFollowUpSubmit()}
            className="mt-6 rounded-full bg-[#111111] px-6 text-white"
          >
            {submitting ? "Checking…" : "Check answer"}
          </Button>
        </>
      ) : (
        <div
          className={cn(
            "mt-6 rounded-lg border p-4 text-sm",
            followUpFeedback.isCorrect
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
          )}
        >
          <p className="font-medium">
            {followUpFeedback.isCorrect ? (
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Correct — you&apos;re getting it.
              </span>
            ) : (
              "Not quite — here's the right answer."
            )}
          </p>
          {!followUpFeedback.isCorrect ? (
            <p className="mt-2 leading-7">
              Correct: {followUpFeedback.correctAnswer}. {followUpFeedback.explanation}
            </p>
          ) : null}
          <Button
            type="button"
            disabled={finishing}
            onClick={() => void handleFollowUpNext()}
            className="mt-4 rounded-full bg-[#111111] px-6 text-white"
          >
            {finishing
              ? "Saving…"
              : followUpIndex < followUpQuestions.length - 1
                ? "Next follow-up"
                : correctCount >= followUpQuestions.length
                  ? "Mistake recovered — continue"
                  : "Continue — we'll review this again"}
          </Button>
        </div>
      )}
    </div>
  );
}
