import type { Attempt } from "@/lib/types";

export type ReviewCard = {
  id?: string;
  skillTag: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lastReviewAt: string | null;
  nextReviewAt: string;
};

export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

const MIN_EASE = 1.3;
const MAX_EASE = 3.0;
const DEFAULT_EASE = 2.5;

export function defaultReviewCard(skillTag: string): ReviewCard {
  return {
    skillTag,
    easeFactor: DEFAULT_EASE,
    intervalDays: 0,
    repetitions: 0,
    lastReviewAt: null,
    nextReviewAt: new Date().toISOString(),
  };
}

export function sm2Schedule(
  card: ReviewCard,
  quality: ReviewQuality
): ReviewCard {
  let { easeFactor, intervalDays, repetitions } = card;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 3;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    repetitions += 1;
  }

  easeFactor = Math.max(
    MIN_EASE,
    Math.min(
      MAX_EASE,
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    )
  );

  const now = new Date();
  const next = new Date(now);
  next.setDate(next.getDate() + intervalDays);

  return {
    ...card,
    easeFactor: Math.round(easeFactor * 100) / 100,
    intervalDays,
    repetitions,
    lastReviewAt: now.toISOString(),
    nextReviewAt: next.toISOString(),
  };
}

export function computeReviewQuality(
  isCorrect: boolean,
  confidence: string | null,
  timeTakenSeconds: number,
  estimatedTime: number
): ReviewQuality {
  if (!isCorrect) {
    if (confidence === "high") return 1;
    if (timeTakenSeconds > estimatedTime * 1.5) return 0;
    return 1;
  }

  if (confidence === "high") return 5;
  if (confidence === "medium") return 4;
  if (timeTakenSeconds <= estimatedTime * 0.8) return 5;
  if (timeTakenSeconds <= estimatedTime) return 4;
  return 3;
}

export function getOverdueCards(
  cards: ReviewCard[]
): ReviewCard[] {
  const now = new Date();
  return cards
    .filter((c) => new Date(c.nextReviewAt) <= now)
    .sort((a, b) => new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime());
}

export function getUpcomingCards(
  cards: ReviewCard[],
  days: number = 7
): { card: ReviewCard; dueInDays: number }[] {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + days);

  return cards
    .filter((c) => {
      const due = new Date(c.nextReviewAt);
      return due > now && due <= cutoff;
    })
    .map((c) => ({
      card: c,
      dueInDays: Math.ceil(
        (new Date(c.nextReviewAt).getTime() - now.getTime()) / 86_400_000
      ),
    }))
    .sort((a, b) => a.dueInDays - b.dueInDays);
}

export function getStaleCards(
  cards: ReviewCard[],
  maxIntervalDays: number = 14
): ReviewCard[] {
  const now = new Date();
  return cards.filter((c) => {
    if (!c.lastReviewAt) return false;
    const daysSinceReview =
      (now.getTime() - new Date(c.lastReviewAt).getTime()) / 86_400_000;
    return daysSinceReview > maxIntervalDays;
  });
}

export function buildReviewCardFromAttempts(
  skillTag: string,
  attempts: Attempt[]
): ReviewCard {
  const card = defaultReviewCard(skillTag);

  const sorted = [...attempts].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  for (const attempt of sorted) {
    const quality = computeReviewQuality(
      attempt.is_correct,
      attempt.confidence,
      attempt.time_taken_seconds,
      90
    );
    const updated = sm2Schedule(card, quality);
    card.easeFactor = updated.easeFactor;
    card.intervalDays = updated.intervalDays;
    card.repetitions = updated.repetitions;
    card.lastReviewAt = updated.lastReviewAt;
    card.nextReviewAt = updated.nextReviewAt;
  }

  return card;
}
