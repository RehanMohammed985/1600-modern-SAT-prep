type StepInput = {
  questionText: string;
  explanation: string;
  correctAnswer: string;
  selectedAnswer?: string;
  section: "math" | "reading";
  formulaOrRule?: string | null;
  underlyingConcept?: string | null;
  conceptExplanation?: string | null;
  commonMistakeExplanation?: string | null;
  commonMistakes?: string[];
  skill?: string;
};

export type TutoringBreakdown = {
  whyWrong: string;
  commonMistake: string;
  conceptSummary: string;
  microSteps: string[];
  workedExample: string[];
  rememberNextTime: string;
};

function splitExplanation(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const byArrow = trimmed.split(/\s*(?:→|->|;\s*)\s*/).map((s) => s.trim()).filter((s) => s.length > 4);
  if (byArrow.length >= 2) return byArrow;

  const byPeriod = trimmed.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 4);
  if (byPeriod.length >= 2) return byPeriod;

  return [trimmed];
}

function explodeToMicroSteps(chunks: string[]): string[] {
  const out: string[] = [];
  for (const chunk of chunks) {
    const parts = chunk.split(/,\s*(?=[A-Za-z])/).map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) out.push(...parts);
    else out.push(chunk);
  }
  return out;
}

function plainConcept(input: StepInput): string {
  const raw =
    input.conceptExplanation?.trim() ||
    input.underlyingConcept?.trim() ||
    null;

  if (raw) {
    const s = raw.split(/(?<=[.!?])\s+/)[0] ?? raw;
    return s.length > 120 ? `${s.slice(0, 117)}…` : s;
  }

  if (input.skill?.startsWith("writing-")) return "The way a sentence is put together changes its meaning.";
  if (input.section === "reading") return "The answer is hiding in the passage — you just have to find the exact words.";
  return "There's one right way to solve this — follow the steps carefully.";
}

export function grammarRuleExplanation(input: StepInput): string | null {
  if (!input.skill?.startsWith("writing-")) return null;
  const rules: Record<string, string> = {
    "writing-grammar": "Subjects and verbs must agree: 'He runs' not 'He run'. Replace the subject with 'he/she/it' to check.",
    "writing-sentence-structure": "Every sentence needs a subject + verb and must be a complete thought. No fragments or run-ons.",
    "writing-punctuation": "Semicolons join two complete sentences. Commas separate items or set off clauses. Dashes add emphasis.",
    "writing-style": "Keep the same verb tense. Don't switch between past, present, and future without a reason.",
    "writing-organization": "Transitions connect ideas: 'however' = contrast, 'therefore' = result, 'furthermore' = add on.",
  };
  for (const [skill, rule] of Object.entries(rules)) {
    if (input.skill === skill || input.skill?.startsWith(skill)) return rule;
  }
  return null;
}

export function buildWhyWrongSimple(input: StepInput): string {
  const picked = input.selectedAnswer?.trim();
  const correct = input.correctAnswer.trim();
  if (!picked || picked.toLowerCase() === correct.toLowerCase()) {
    return "You were super close — just tripped on one tiny thing. Look at the steps and see where you slipped.";
  }

  const grammarRule = grammarRuleExplanation(input);

  if (grammarRule) {
    return `You picked "${picked}", but the right answer is "${correct}". Here's why: ${grammarRule} Your answer "${picked}" doesn't follow that rule.`;
  }

  const concept = plainConcept(input);
  const work = splitExplanation(input.explanation);
  const firstFix = work[0] ?? input.explanation;
  const plainFix = firstFix.length > 140 ? firstFix.slice(0, 137) + "..." : firstFix;

  return `You picked "${picked}", but the right answer is "${correct}". ${concept} ${plainFix}`;
}

export function buildCommonMistakeHint(input: StepInput): string {
  if (input.commonMistakeExplanation?.trim()) {
    return input.commonMistakeExplanation.trim();
  }
  if (input.commonMistakes?.length) {
    return input.commonMistakes[0];
  }
  if (input.section === "reading") {
    return "Many students pick an answer that sounds true but doesn't actually answer the question. Check the passage again.";
  }
  if (input.underlyingConcept?.toLowerCase().includes("slope")) {
    return "Common mistake: swapping the top and bottom numbers or subtracting in the wrong order.";
  }
  return "Common mistake: rushing and picking without checking each step.";
}

export function buildRememberNextTime(input: StepInput): string {
  const grammarRule = grammarRuleExplanation(input);
  if (grammarRule) {
    return "Next time: read the sentence without the underlined part. Then try each choice in the blank. Only one will sound right AND follow the grammar rule.";
  }
  if (input.formulaOrRule?.trim()) {
    return "Next time: write down the formula first. Then plug in numbers one at a time. Don't skip steps — that's where the trap is.";
  }
  if (input.section === "reading") {
    return "Next time: read the question first, then hunt for the exact words in the passage that back up your answer. If you can't find them, it's probably wrong.";
  }
  return "Next time: solve step by step on paper. Don't try to do it all in your head — that's how tiny mistakes slip in.";
}

function buildWorkedExample(input: StepInput, steps: string[]): string[] {
  const core = steps.slice(0, 5);
  if (!core.length) {
    return [`The correct answer is ${input.correctAnswer}.`];
  }
  return [
    "Walk through it like this:",
    ...core.map((s, i) => `Step ${i + 1}: ${s.replace(/\.$/, "")}`),
    `Answer: ${input.correctAnswer}`,
  ];
}

export function buildTutoringBreakdown(input: StepInput): TutoringBreakdown {
  const chunks = splitExplanation(input.explanation);
  const microSteps: string[] = [];

  const grammarRule = grammarRuleExplanation(input);
  if (grammarRule) {
    microSteps.push("Read the sentence without the underlined part.");
    microSteps.push("Ask yourself: does this sound right with each choice?");
    microSteps.push("Check the grammar rule against your pick.");
  } else if (input.section === "reading" && !input.skill?.startsWith("writing-")) {
    microSteps.push("Look at the question — what is it actually asking?");
    microSteps.push("Find the spot in the passage that talks about this.");
    microSteps.push("Read those lines and pick the answer that matches.");
  } else {
    microSteps.push("Figure out what the question wants you to find.");
    microSteps.push(input.formulaOrRule?.trim()
      ? `Use this: ${input.formulaOrRule.trim().split(/[.!?]/)[0]}`
      : "Solve it one piece at a time.");
  }

  explodeToMicroSteps(chunks).slice(0, 1).forEach((chunk) => {
    const c = chunk.endsWith(".") ? chunk : `${chunk}.`;
    if (!microSteps.includes(c)) microSteps.push(c);
  });

  microSteps.push(`Answer: ${input.correctAnswer}`);

  const trimmedSteps = microSteps.slice(0, 4);

  return {
    whyWrong: buildWhyWrongSimple(input),
    commonMistake: buildCommonMistakeHint(input),
    conceptSummary: plainConcept(input),
    microSteps: trimmedSteps,
    workedExample: buildWorkedExample(input, trimmedSteps),
    rememberNextTime: buildRememberNextTime(input),
  };
}

/** @deprecated use buildTutoringBreakdown().microSteps */
export function buildSolutionSteps(input: StepInput): string[] {
  return buildTutoringBreakdown(input).microSteps;
}
