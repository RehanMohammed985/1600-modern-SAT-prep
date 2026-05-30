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
    (input.section === "math"
      ? "This problem tests one math rule. Learn the rule, then match your steps to an answer choice."
      : "This question tests one reading skill. Find proof in the passage before you pick.");
  const sentence = raw.split(/(?<=[.!?])\s+/)[0] ?? raw;
  return sentence.length > 160 ? `${sentence.slice(0, 157)}…` : sentence;
}

export function buildWhyWrongSimple(input: StepInput): string {
  const picked = input.selectedAnswer?.trim();
  const correct = input.correctAnswer.trim();
  if (!picked || picked.toLowerCase() === correct.toLowerCase()) {
    return "You were close — one small step was off. Walk through the worked example below.";
  }

  const work = splitExplanation(input.explanation);
  const firstFix = work[0] ?? input.explanation;
  const concept = plainConcept(input);

  return `You picked "${picked}", but the correct answer is "${correct}". ${firstFix} The big idea: ${concept}`;
}

export function buildCommonMistakeHint(input: StepInput): string {
  if (input.commonMistakeExplanation?.trim()) {
    return input.commonMistakeExplanation.trim();
  }
  if (input.commonMistakes?.length) {
    return input.commonMistakes[0];
  }
  if (input.underlyingConcept?.toLowerCase().includes("slope")) {
    return "A lot of students swap the top and bottom numbers or subtract in the wrong order.";
  }
  if (input.section === "reading") {
    return "Many students pick an answer that is true in the passage but does not answer the exact question.";
  }
  return "Many students rush and skip writing out each step before picking an answer.";
}

export function buildRememberNextTime(input: StepInput): string {
  if (input.formulaOrRule?.trim()) {
    const rule = input.formulaOrRule.split(/[.!?]/)[0];
    return `Before you pick, say the rule out loud: ${rule}. Then match your work to one answer choice.`;
  }
  if (input.section === "math") {
    return "Write each step on its own line. Only pick an answer after the last step matches a choice.";
  }
  return "Underline what the question asks, then find proof in the passage before you choose.";
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

  if (input.section === "math") {
    microSteps.push("Circle what the question asks you to find.");
  } else {
    microSteps.push("Underline the question, then find the lines in the passage it refers to.");
  }

  if (input.formulaOrRule?.trim()) {
    microSteps.push(`Use: ${input.formulaOrRule.trim()}`);
  }

  explodeToMicroSteps(chunks).forEach((chunk) => {
    microSteps.push(chunk.endsWith(".") ? chunk : `${chunk}.`);
  });

  microSteps.push(`Pick: ${input.correctAnswer}`);

  const trimmedSteps = microSteps.slice(0, 6);

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
