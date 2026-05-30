"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { advanceSessionPhase, submitAttempt, type SubmitAttemptResult } from "@/app/actions";
import { prepareMistakeArena } from "@/app/mistake-arena-actions";
import { SurfaceCard } from "@/components/app-shell";
import { MistakeArena } from "@/components/mistake-arena";
import { SessionBreakScreen } from "@/components/session-break-screen";
import { SessionCompleteScreen } from "@/components/session-complete-screen";
import { ReadingPassageBlock } from "@/components/reading-passage-block";
import { SessionReviewPanel } from "@/components/session-review-panel";
import { SessionSchedulePanel } from "@/components/session-schedule-panel";
import { Button } from "@/components/ui/button";
import {
  activeBlock,
  getSessionSchedule,
  shouldShowBreakAfterPhase,
  type StudyMode,
} from "@/lib/session-schedule";
import type { Attempt, ConfidenceLevel, PhasePlan, Question, SessionPhase } from "@/lib/types";
import { SKILL_LABELS } from "@/lib/types";
import { isPassageReadingQuestion, passageGroupId } from "@/lib/reading-bank";
import { buildTakeawayBullets } from "@/lib/tutoring";
import { cn, formatSkillTag } from "@/lib/utils";

type Props = {
  sessionId: string;
  currentPhase: SessionPhase;
  phasePlan: PhasePlan;
  questionsById: Record<string, Question>;
  studyMode?: StudyMode;
  focusSkill?: string;
  studyMinutes?: number;
  studyTrackLabel?: string;
  foundationReadiness?: number;
  sessionAttempts?: Attempt[];
};

function normalizePhase(phase: SessionPhase | "review" | "mixed"): SessionPhase {
  if (phase === "mixed") return "timed";
  if (phase === "review") return "mistakes";
  return phase;
}

export function SessionRunner({
  sessionId,
  currentPhase,
  phasePlan,
  questionsById,
  studyMode = "standard",
  focusSkill = "core skills",
  studyMinutes = 30,
  studyTrackLabel,
  foundationReadiness,
  sessionAttempts = [],
}: Props) {
  const router = useRouter();
  const phase = normalizePhase(currentPhase);
  const schedule = useMemo(() => getSessionSchedule(studyMode, studyMinutes), [studyMode, studyMinutes]);
  const [skipQuestionIds, setSkipQuestionIds] = useState<Set<string>>(() => new Set());

  const phaseQuestions = useMemo(() => {
    if (phase === "complete" || phase === "takeaway") return [];
    const ids = phasePlan[phase] ?? [];
    return ids
      .map((id) => questionsById[id])
      .filter(Boolean)
      .filter((q) => !skipQuestionIds.has(q.id));
  }, [phase, phasePlan, questionsById, skipQuestionIds]);

  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<ConfidenceLevel | null>(null);
  const [feedback, setFeedback] = useState<SubmitAttemptResult | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [blockSeconds, setBlockSeconds] = useState(0);
  const [inBreak, setInBreak] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [phaseError, setPhaseError] = useState<string | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [inArena, setInArena] = useState(false);
  const [arenaFollowUps, setArenaFollowUps] = useState<Question[]>([]);
  const [arenaLoading, setArenaLoading] = useState(false);

  const question = phaseQuestions[questionIndex];
  const totalInPhase = phaseQuestions.length;
  const block = activeBlock(schedule, phase, inBreak);
  const blockTotal = block?.durationSeconds ?? 300;
  const blockRemaining = Math.max(0, blockTotal - blockSeconds);

  const timedMode =
    studyMode === "test"
      ? phase === "focus" || phase === "timed"
      : studyMode === "standard" && (phase === "focus" || phase === "timed");

  const relaxedPace = studyMode === "beginner";

  useEffect(() => {
    setQuestionIndex(0);
    setSelected(null);
    setConfidence(null);
    setFeedback(null);
    setSeconds(0);
    setBlockSeconds(0);
    setInBreak(false);
    setPhaseError(null);
    setAnswerError(null);
    setInArena(false);
    setArenaFollowUps([]);
    setArenaLoading(false);
  }, [currentPhase]);

  useEffect(() => {
    setSeconds(0);
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [question?.id]);

  useEffect(() => {
    setBlockSeconds(0);
    const t = setInterval(() => setBlockSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase, inBreak]);

  const goToNextPhase = useCallback(async () => {
    setSubmitting(true);
    setPhaseError(null);
    try {
      const result = await advanceSessionPhase(sessionId);
      if (result.error) {
        setPhaseError(result.error);
        setSubmitting(false);
        return;
      }
      if (result.nextPhase === "complete") {
        setSubmitting(false);
        router.refresh();
        return;
      }
      setSubmitting(false);
      router.refresh();
    } catch {
      setPhaseError("Could not load the next part. Try again.");
      setSubmitting(false);
    }
  }, [router, sessionId]);

  useEffect(() => {
    if (phase === "complete" || phase === "takeaway" || inBreak || totalInPhase > 0 || submitting)
      return;
    void goToNextPhase();
  }, [phase, totalInPhase, submitting, inBreak, goToNextPhase]);

  const skillLabel = question
    ? SKILL_LABELS[question.skill] ?? formatSkillTag(question.skill)
    : "";

  const readingSetSize =
    question?.section === "reading"
      ? phaseQuestions.filter(
          (q) =>
            q.section === "reading" &&
            passageGroupId(q) === passageGroupId(question) &&
            passageGroupId(q)
        ).length
      : 0;

  const readingSetIndex =
    question?.section === "reading" && readingSetSize > 1
      ? phaseQuestions
          .filter(
            (q) =>
              q.section === "reading" &&
              passageGroupId(q) === passageGroupId(question)
          )
          .findIndex((q) => q.id === question.id) + 1
      : 0;

  const questionLabel =
    totalInPhase > 0
      ? `Question ${questionIndex + 1} of ${totalInPhase} in this block`
      : "No questions in this block";

  if (phase === "complete") {
    const bullets = buildTakeawayBullets(
      sessionAttempts.filter((a) => !a.is_correct),
      questionsById
    );
    return (
      <div className="space-y-6">
        <SessionCompleteScreen takeaways={bullets} />
      </div>
    );
  }

  if (inBreak) {
    const breakBlock = schedule.find((b) => b.kind === "break")!;
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <SessionSchedulePanel
          schedule={schedule}
          phase={phase}
          inBreak
          blockRemaining={blockRemaining}
          blockTotal={blockTotal}
          studyMode={studyMode}
          focusSkill={focusSkill}
          questionLabel="Break before timed practice"
        />
        <SessionBreakScreen
          block={breakBlock}
          durationSeconds={breakBlock.durationSeconds}
          onContinue={() => {
            setInBreak(false);
            void goToNextPhase();
          }}
        />
      </div>
    );
  }

  if (phase === "takeaway") {
    const bullets = buildTakeawayBullets(
      sessionAttempts.filter((a) => !a.is_correct),
      questionsById
    );
    const summaryBlock = schedule.find((b) => b.kind === "summary");
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <SessionSchedulePanel
          schedule={schedule}
          phase={phase}
          inBreak={false}
          blockRemaining={blockRemaining}
          blockTotal={blockTotal}
          studyMode={studyMode}
          focusSkill={focusSkill}
          questionLabel="Summary — no questions"
        />
        <SurfaceCard>
          <p className="text-xs uppercase tracking-[0.2em] text-black/45">Summary</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">What to remember</h2>
          <p className="mt-2 text-sm text-black/55">{summaryBlock?.why}</p>
          <ul className="mt-6 space-y-3">
            {bullets.map((b) => (
              <li
                key={b}
                className="rounded-xl border border-black/5 bg-[#F7F4EE] px-4 py-3 text-sm leading-7 text-black/75"
              >
                {b}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-black/50">After this: {summaryBlock?.after}</p>
          <Button
            type="button"
            onClick={() => void goToNextPhase()}
            disabled={submitting}
            className="mt-8 rounded-full bg-[#111111] px-6 text-white hover:bg-black/90"
          >
            {submitting ? "Finishing…" : "Finish session"}
          </Button>
        </SurfaceCard>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="space-y-6">
        <SessionSchedulePanel
          schedule={schedule}
          phase={phase}
          inBreak={false}
          blockRemaining={blockRemaining}
          blockTotal={blockTotal}
          studyMode={studyMode}
          focusSkill={focusSkill}
          questionLabel={questionLabel}
        />
        <SurfaceCard className="text-center">
          <p className="text-lg font-medium">This block is done</p>
          <p className="mt-2 text-sm text-black/55">
            {submitting ? "Loading the next part…" : block?.after ?? "Ready for what's next."}
          </p>
          {phaseError ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {phaseError}
            </p>
          ) : null}
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              type="button"
              disabled={submitting}
              onClick={() => void goToNextPhase()}
              className="rounded-full bg-[#111111] px-6 text-white hover:bg-black/90"
            >
              {submitting ? "Please wait…" : "Continue"}
            </Button>
            <Button asChild variant="outline" className="rounded-full border-black/10">
              <Link href="/dashboard">Exit to dashboard</Link>
            </Button>
          </div>
        </SurfaceCard>
      </div>
    );
  }

  async function handleSubmit() {
    if (!selected || submitting || !question) return;
    setSubmitting(true);
    setAnswerError(null);
    try {
      const result = await submitAttempt(
        sessionId,
        question.id,
        selected,
        seconds || question.estimatedTime,
        {
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          conceptExplanation: question.conceptExplanation,
          formulaOrRule: question.formulaOrRule,
          underlyingConcept: question.underlyingConcept,
          commonMistakes: question.commonMistakes,
          section: question.section,
          skill: question.skill,
          estimatedTime: question.estimatedTime,
          mistakeTypes: question.mistakeTypes,
        },
        confidence
      );

      if (!result.correctAnswer && result.error) {
        setAnswerError(result.error);
        return;
      }

      setFeedback(result);
      if (result.error) setAnswerError(result.error);

      if (!result.isCorrect && question) {
        setArenaLoading(true);
        try {
          const allSessionIds = [
            ...phasePlan.warmup,
            ...phasePlan.focus,
            ...phasePlan.mixed,
            ...phasePlan.timed,
            ...phasePlan.mistakes,
          ];
          const arena = await prepareMistakeArena({
            sessionId,
            sourceQuestionId: question.id,
            reservedQuestionIds: [...new Set([...allSessionIds, ...skipQuestionIds])],
          });
          if (arena.error) {
            setAnswerError(arena.error);
          } else if (arena.followUpQuestions.length > 0) {
            const arenaIds = arena.followUpQuestions.map((q) => q.id);
            setSkipQuestionIds((prev) => {
              const next = new Set(prev);
              for (const id of arenaIds) next.add(id);
              return next;
            });
            setArenaFollowUps(arena.followUpQuestions);
            setInArena(true);
          }
        } finally {
          setArenaLoading(false);
        }
      }
    } catch {
      setAnswerError("Could not check your answer. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNext() {
    setInArena(false);
    setArenaFollowUps([]);
    if (questionIndex < totalInPhase - 1) {
      setQuestionIndex((i) => i + 1);
      setSelected(null);
      setConfidence(null);
      setFeedback(null);
      setAnswerError(null);
      setSeconds(0);
      return;
    }
    if (shouldShowBreakAfterPhase(phase)) {
      setInBreak(true);
      setBlockSeconds(0);
      return;
    }
    await goToNextPhase();
  }

  const timeLimit =
    question.estimatedTime *
    (relaxedPace ? 1.6 : studyMode === "test" ? 0.85 : timedMode ? 1 : 1.25);
  const timedOut = timedMode && seconds > timeLimit;

  const focusBg = phase === "focus" || phase === "timed";

  return (
    <div className="space-y-6">
      <SessionSchedulePanel
        schedule={schedule}
        phase={phase}
        inBreak={false}
        blockRemaining={blockRemaining}
        blockTotal={blockTotal}
        studyMode={studyMode}
        focusSkill={focusSkill}
        questionLabel={questionLabel}
        trackLabel={studyTrackLabel}
        foundationReadiness={foundationReadiness}
      />

      <SurfaceCard
        className={cn(
          "transition-opacity duration-300",
          focusBg && "session-focus-bg relative overflow-hidden"
        )}
      >
        {focusBg ? <div className="session-focus-glow pointer-events-none absolute inset-0" aria-hidden /> : null}

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/5 pb-5">
            <p className="text-xs uppercase tracking-[0.2em] text-black/45">
              {question.section === "math" ? "Math" : "Reading"} · {skillLabel}
            </p>
            <p className="text-sm tabular-nums text-black/45">
              {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, "0")}
              {timedMode ? (
                <span className={cn("ml-2 text-xs", timedOut && "font-medium text-amber-700")}>
                  goal under {Math.round(timeLimit / 60)}:
                  {(timeLimit % 60).toString().padStart(2, "0")}
                </span>
              ) : relaxedPace ? (
                <span className="ml-2 text-xs">· no rush</span>
              ) : null}
            </p>
          </div>

          {question.section === "reading" && isPassageReadingQuestion(question) ? (
            <>
              {question.passage ? (
                <ReadingPassageBlock passage={question.passage} />
              ) : (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Passage missing — start a new session from your dashboard.
                </p>
              )}
              {readingSetSize > 1 ? (
                <p className="mt-3 text-sm text-black/50">
                  Question {readingSetIndex} of {readingSetSize} on this passage — read the lines
                  carefully before you pick.
                </p>
              ) : (
                <p className="mt-3 text-sm text-black/50">
                  Read the full passage first, then answer below.
                </p>
              )}
            </>
          ) : null}

          <h2 className="mt-6 text-xl font-medium leading-relaxed text-black/90 md:text-2xl">
            {question.questionText}
          </h2>

          {!feedback ? (
            <>
              {question.choices.length === 0 ? (
                <p className="mt-8 text-sm text-black/55">
                  No choices loaded — start a new session from your dashboard.
                </p>
              ) : (
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {question.choices.map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        setSelected(choice);
                        setAnswerError(null);
                      }}
                      className={cn(
                        "rounded-xl border px-4 py-4 text-left text-sm leading-6 transition",
                        selected === choice
                          ? "border-[#111111] bg-[#111111] text-white"
                          : "border-black/10 bg-[#FCFBF8] hover:border-black/20"
                      )}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              )}

              {studyMode !== "test" ? (
                <>
                  <p className="mt-6 text-sm text-black/45">How sure are you?</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["low", "medium", "high"] as ConfidenceLevel[]).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setConfidence(c)}
                        className={cn(
                          "rounded-full px-4 py-2 text-sm capitalize",
                          confidence === c ? "bg-[#111111] text-white" : "bg-black/5 text-black/55"
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}

              {answerError ? (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {answerError}
                </p>
              ) : null}

              <Button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!selected || submitting || question.choices.length === 0}
                className="mt-6 rounded-full bg-[#111111] px-6 text-white hover:bg-black/90"
              >
                {submitting ? "Checking…" : "Check answer"}
              </Button>
              {!selected ? (
                <p className="mt-2 text-sm text-black/45">Pick an answer first.</p>
              ) : null}
            </>
          ) : inArena && feedback && !feedback.isCorrect && question ? (
            <MistakeArena
              sessionId={sessionId}
              parentAttemptId={feedback.attemptId}
              feedback={feedback}
              sourceQuestion={question}
              followUpQuestions={arenaFollowUps}
              studyMode={studyMode}
              onComplete={() => void handleNext()}
            />
          ) : arenaLoading && feedback && !feedback.isCorrect ? (
            <p className="mt-8 text-sm text-black/55">Loading Mistake Arena…</p>
          ) : (
            <SessionReviewPanel
              feedback={feedback}
              questionId={question.id}
              questionText={question.questionText}
              skill={question.skill}
              section={question.section}
              choices={question.choices}
              difficulty={question.difficulty}
              formulaLatex={question.formulaLatex}
              commonMistakeExplanation={question.commonMistakeExplanation}
              showFormula={question.section === "math"}
              studyMode={studyMode}
              onNext={() => void handleNext()}
              nextLabel={
                questionIndex < totalInPhase - 1
                  ? "Next question"
                  : shouldShowBreakAfterPhase(phase)
                    ? "Take a break"
                    : "Next block"
              }
              submitting={submitting}
            />
          )}
        </div>
      </SurfaceCard>

      <div className="flex items-center justify-between text-xs text-black/40">
        <span>{block?.title ?? "Session"}</span>
        <Link href="/dashboard" className="font-medium text-black/55 hover:text-black">
          Exit to dashboard
        </Link>
      </div>
    </div>
  );
}
