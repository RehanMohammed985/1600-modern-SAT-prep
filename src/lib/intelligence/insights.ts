import type { SkillMetrics } from "./skill-score";
import { SKILL_LABELS } from "@/lib/types";
import { formatSkillTag } from "@/lib/utils";

export type ReviewRecommendation = {
  skill: string;
  label: string;
  reason: string;
  priority: "high" | "medium";
};

function label(skill: string) {
  return SKILL_LABELS[skill] ?? formatSkillTag(skill);
}

export function getWeakAreasFromMetrics(metrics: SkillMetrics[]) {
  return metrics
    .filter((m) => m.attempts >= 2 && (m.skillScore < 0.6 || m.accuracy < 0.6))
    .map((m) => ({
      skill_tag: m.skill_tag,
      accuracy: m.accuracy,
      attempts: m.attempts,
      skillScore: m.skillScore,
    }));
}

export function getImprovingFromMetrics(metrics: SkillMetrics[]) {
  return metrics
    .filter((m) => m.attempts >= 2 && m.skillScore >= 0.75)
    .map((m) => ({
      skill_tag: m.skill_tag,
      accuracy: m.accuracy,
      attempts: m.attempts,
      skillScore: m.skillScore,
    }));
}

export function detectTimingIssues(metrics: SkillMetrics[]): boolean {
  return metrics.some((m) => m.hasTimingIssue && m.attempts >= 2);
}

export function detectConceptGaps(metrics: SkillMetrics[]) {
  return metrics
    .filter((m) => m.hasConceptGap && m.attempts >= 2)
    .map((m) => ({
      skill_tag: m.skill_tag,
      label: label(m.skill_tag),
      skillScore: m.skillScore,
    }));
}

export function buildReviewRecommendations(metrics: SkillMetrics[]): ReviewRecommendation[] {
  const out: ReviewRecommendation[] = [];
  for (const m of metrics) {
    if (m.reviewUsageRate > 0.3 && m.skillScore < 0.65) {
      out.push({
        skill: m.skill_tag,
        label: label(m.skill_tag),
        reason: "You marked several questions here for review — let's close the gap tonight.",
        priority: "high",
      });
    } else if (m.retryRate > 0.35 && m.accuracy < 0.7) {
      out.push({
        skill: m.skill_tag,
        label: label(m.skill_tag),
        reason: "Retries are high — a short concept refresh will help.",
        priority: "medium",
      });
    } else if (m.hasConceptGap) {
      out.push({
        skill: m.skill_tag,
        label: label(m.skill_tag),
        reason: "Misses look like concept gaps, not careless errors.",
        priority: "high",
      });
    }
  }
  return out.slice(0, 4);
}

export function adaptiveStudyMessage(
  metrics: SkillMetrics[],
  options?: { timingIssues?: boolean; beginnerPath?: boolean }
): string {
  if (options?.timingIssues) {
    return "Tonight: extra time on focus practice, then lighter timed work.";
  }
  if (!metrics.length) {
    return options?.beginnerPath
      ? "First session — we'll learn your strengths as you go."
      : "Start a session — we'll adapt to how you answer.";
  }
  const focus = metrics[0];
  const name = label(focus.skill_tag);
  const pct = Math.round(focus.skillScore * 100);
  if (focus.skillScore < 0.55) {
    return `Focus tonight: ${name} (skill score ${pct}%). Easier questions first, then review.`;
  }
  if (focus.skillScore < 0.75) {
    return `Balanced session on ${name} — skill score ${pct}%. Mix practice and timed blocks.`;
  }
  return `You're strong on ${name} — we'll add harder timed questions to push you.`;
}
