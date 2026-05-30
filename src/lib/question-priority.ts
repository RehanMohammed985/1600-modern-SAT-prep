import type { SkillMetrics } from "./intelligence/skill-score";

export type SkillPriority = {
  skill_tag: string;
  score: number;
  reason: string;
};

/**
 * Deterministic priority (no AI):
 * 1 weak skills  2 recent misses (recency-weighted)  3 unmastered  4 retention
 * Also uses consistency, confidence, and recovery signals.
 */
export function rankSkillsForPractice(
  metrics: SkillMetrics[],
  recentWrongSkills: string[] = []
): SkillPriority[] {
  const ranked: SkillPriority[] = [];

  for (const m of metrics) {
    let score = 0;
    const reasons: string[] = [];

    if (m.skillScore < 0.6 || m.hasConceptGap) {
      score += 100 - m.skillScore * 100;
      reasons.push("weak area");
    }

    recentWrongSkills.forEach((skill, index) => {
      if (m.skill_tag !== skill) return;
      const recencyBoost = Math.max(12, 48 - index * 12);
      score += recencyBoost;
      reasons.push(index === 0 ? "most recent miss" : "recent miss");
    });

    if (m.skillScore < 0.75 && m.attempts < 8) {
      score += 25;
      reasons.push("not mastered yet");
    }
    if (m.retention < 0.55 && m.attempts >= 3) {
      score += 20;
      reasons.push("needs retention review");
    }
    if (m.retryRate > 0.3) {
      score += 15;
      reasons.push("retries high");
    }
    if (m.consistency < 0.5 && m.attempts >= 3) {
      score += 18;
      reasons.push("inconsistent");
    }
    if (m.confidence < 0.45 && m.attempts >= 2) {
      score += 14;
      reasons.push("low confidence");
    }
    if (m.recoveredMistakes > 0 && m.skillScore < 0.72) {
      score += 10;
      reasons.push("reinforce recovery");
    }
    if (m.hasTimingIssue) {
      score += 8;
      reasons.push("timing pressure");
    }

    if (score > 0) {
      ranked.push({
        skill_tag: m.skill_tag,
        score,
        reason: reasons.join(", "),
      });
    }
  }

  return ranked.sort((a, b) => b.score - a.score);
}

export function pickTopPrioritySkill(
  metrics: SkillMetrics[],
  recentWrongSkills: string[] = []
): string | null {
  const ranked = rankSkillsForPractice(metrics, recentWrongSkills);
  return ranked[0]?.skill_tag ?? metrics[0]?.skill_tag ?? null;
}

/** Most recent wrong-answer skills first (deduped). */
export function recentWrongSkillsOrdered(
  wrongQuestionIds: string[],
  questionsById: Map<string, { skill: string; skill_tag?: string }>
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of wrongQuestionIds) {
    const q = questionsById.get(id);
    const skill = q?.skill ?? q?.skill_tag;
    if (!skill || seen.has(skill)) continue;
    seen.add(skill);
    out.push(skill);
  }
  return out;
}
