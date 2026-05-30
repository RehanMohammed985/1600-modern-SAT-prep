import type { QuestionBlueprint } from "./blueprint";

export function questionFactorySystemPrompt(): string {
  return `You are 1600's SAT question author. Write original, exam-quality multiple-choice items.
Rules:
- Exactly 4 answer choices; only one is correct.
- correctAnswer must match one choice exactly (same text).
- Explanations must be clear, step-by-step, and SAT-appropriate.
- Do not copy real College Board items.
- Return valid JSON only—no markdown fences.`;
}

export function questionFactoryUserPrompt(blueprint: QuestionBlueprint): string {
  const passageBlock =
    blueprint.subject === "reading" && !blueprint.skill.startsWith("writing-")
      ? `
Include a numbered passage (120-180 words) in "passage" with passageText, topic, tone, readingSkill, estimatedReadSeconds, difficulty.
Questions must refer to the passage.`
      : "";

  return `Create one SAT ${blueprint.subject} question pack from this blueprint:

Subject: ${blueprint.subject}
Skill: ${blueprint.skill}
Subskill: ${blueprint.subskill}
Difficulty (1-5): ${blueprint.difficulty}
Question style: ${blueprint.questionStyle}
Common mistake to target: ${blueprint.commonMistake}
Formula or rule (if applicable): ${blueprint.formula ?? "none"}
Concept framework: ${blueprint.conceptFramework}
${passageBlock}

Return JSON with this shape:
{
  "questionText": "",
  "choices": ["", "", "", ""],
  "correctAnswer": "",
  "explanation": "",
  "conceptExplanation": "",
  "commonMistakeExplanation": "",
  "underlyingConcept": "",
  "formulaOrRule": ${blueprint.formula ? `"${blueprint.formula}"` : "null"},
  "formulaLatex": null,
  "commonMistakes": ["", ""],
  "mistakeTypes": ["concept_gap"],
  "estimatedTime": 90,
  "easierVariation": {
    "questionText": "",
    "choices": ["", "", "", ""],
    "correctAnswer": "",
    "explanation": "",
    "difficulty": ${Math.max(1, blueprint.difficulty - 1)}
  },
  "harderVariation": {
    "questionText": "",
    "choices": ["", "", "", ""],
    "correctAnswer": "",
    "explanation": "",
    "difficulty": ${Math.min(5, blueprint.difficulty + 1)}
  }
}`;
}

export function tutoringReviewEnhancementPrompt(input: {
  questionText: string;
  selectedAnswer: string;
  correctAnswer: string;
  skill: string;
  section: string;
  underlyingConcept: string;
  explanation: string;
  formulaOrRule?: string | null;
}): string {
  const q =
    input.questionText.length > 280 ? `${input.questionText.slice(0, 277)}…` : input.questionText;
  return `You are a patient SAT tutor for the app "1600". The student got a question wrong.
Write a clear, detailed explanation a 10th grader can follow. Use short sentences.

Return JSON only:
{
  "whyWrong": "2-3 sentences: why THEIR wrong answer fails and what the correct approach is",
  "commonMistake": "1-2 sentences on what students usually do wrong here",
  "simpleExplanation": "2-4 sentences walking through the solution in plain language",
  "rememberNextTime": "1 concrete habit before picking an answer",
  "practiceNext": "1 specific next practice step",
  "solutionSteps": ["step 1", "step 2", "step 3", "step 4"],
  "workedExample": ["optional line 1", "optional line 2"]
}

Question (${input.section}, ${input.skill}): ${q}
Student picked: ${input.selectedAnswer}
Correct answer: ${input.correctAnswer}
Core concept: ${input.underlyingConcept.slice(0, 160)}
Original explanation: ${input.explanation.slice(0, 400)}
${input.formulaOrRule ? `Rule: ${input.formulaOrRule.slice(0, 120)}` : ""}`;
}
