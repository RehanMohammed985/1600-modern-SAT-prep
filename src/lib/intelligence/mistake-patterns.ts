import type { Attempt, MistakeType, Question } from "@/lib/types";

export type MistakePattern = {
  skillTag: string;
  mistakeType: MistakeType;
  count: number;
  lastOccurrenceAt: string;
  recurring: boolean;
  frequency: "rare" | "occasional" | "frequent" | "chronic";
};

export type MistakeCluster = {
  label: string;
  pattern: string;
  skills: string[];
  mistakeTypes: MistakeType[];
  count: number;
  recommendation: string;
};

export function buildMistakePatterns(
  attempts: Attempt[],
  questionsById: Map<string, Question>
): MistakePattern[] {
  const groups = new Map<string, { count: number; lastDate: string }>();

  const sorted = [...attempts]
    .filter((a) => !a.is_correct && a.mistake_type)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

  for (const attempt of sorted) {
    const q = questionsById.get(attempt.question_id);
    if (!q || !attempt.mistake_type) continue;

    const key = `${q.skill ?? q.skill_tag}:${attempt.mistake_type}`;
    const existing = groups.get(key);
    groups.set(key, {
      count: (existing?.count ?? 0) + 1,
      lastDate: attempt.created_at,
    });
  }

  const totalAttempts = attempts.filter((a) => !a.is_correct).length || 1;

  return Array.from(groups.entries())
    .map(([key, data]) => {
      const [skillTag, mistakeType] = key.split(":") as [string, MistakeType];
      const ratio = data.count / totalAttempts;

      let frequency: MistakePattern["frequency"] = "rare";
      if (ratio >= 0.4) frequency = "chronic";
      else if (ratio >= 0.25) frequency = "frequent";
      else if (ratio >= 0.12) frequency = "occasional";

      return {
        skillTag,
        mistakeType,
        count: data.count,
        lastOccurrenceAt: data.lastDate,
        recurring: data.count >= 2,
        frequency,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function detectPatternClusters(
  patterns: MistakePattern[],
  minRecurring: number = 2
): MistakeCluster[] {
  const clusters: MistakeCluster[] = [];

  const recurring = patterns.filter(
    (p) => p.recurring && p.count >= minRecurring
  );

  if (recurring.length === 0) return clusters;

  const byType = new Map<MistakeType, MistakePattern[]>();
  for (const p of recurring) {
    const list = byType.get(p.mistakeType) ?? [];
    list.push(p);
    byType.set(p.mistakeType, list);
  }

  for (const [type, items] of byType) {
    if (items.length < minRecurring) continue;

    const skills = items.map((i) => i.skillTag);
    const total = items.reduce((s, i) => s + i.count, 0);

    let recommendation = "";
    switch (type) {
      case "timing":
        recommendation = "Practice with a timer. Write the key info first, then solve.";
        break;
      case "concept_gap":
        recommendation = "Focus on fundamental concepts. Try easier variations to build understanding.";
        break;
      case "careless":
        recommendation = "Slow down. Double-check each step before selecting an answer.";
        break;
      case "misread":
        recommendation = "Circle what the question asks. Read the full question twice.";
        break;
      case "vocabulary":
        recommendation = "Underline unfamiliar words. Use context clues in surrounding sentences.";
        break;
      case "setup_error":
        recommendation = "Write the setup steps before calculating. Check units and variables.";
        break;
    }

    clusters.push({
      label: `Recurring ${type.replace(/_/g, " ")} errors`,
      pattern: `You consistently make ${type.replace(/_/g, " ")} mistakes across ${skills.length} skills`,
      skills: [...new Set(skills)],
      mistakeTypes: [type],
      count: total,
      recommendation,
    });
  }

  return clusters;
}

export function getMistakeTrend(
  attempts: Attempt[]
): "improving" | "stable" | "worsening" {
  const sorted = [...attempts]
    .filter((a) => a.mistake_type)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

  if (sorted.length < 6) return "stable";

  const half = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, half);
  const secondHalf = sorted.slice(-half);

  const firstMissRate =
    firstHalf.filter((a) => !a.is_correct).length / firstHalf.length;
  const secondMissRate =
    secondHalf.filter((a) => !a.is_correct).length / secondHalf.length;

  if (secondMissRate < firstMissRate * 0.8) return "improving";
  if (secondMissRate > firstMissRate * 1.2) return "worsening";
  return "stable";
}

export function getTopMistakeSkills(
  patterns: MistakePattern[],
  limit: number = 3
): { skillTag: string; mistakeType: MistakeType; count: number }[] {
  return patterns
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((p) => ({
      skillTag: p.skillTag,
      mistakeType: p.mistakeType,
      count: p.count,
    }));
}

export function mistakeRecoveryRate(
  attempts: Attempt[]
): { rate: number; totalRecovered: number; totalMistakes: number } {
  const mistakes = attempts.filter((a) => !a.is_correct);
  const recovered = mistakes.filter((a) => a.mistake_recovered);
  return {
    rate: mistakes.length ? recovered.length / mistakes.length : 0,
    totalRecovered: recovered.length,
    totalMistakes: mistakes.length,
  };
}
