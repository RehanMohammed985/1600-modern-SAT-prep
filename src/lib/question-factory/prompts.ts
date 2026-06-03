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
    input.questionText.length > 320 ? `${input.questionText.slice(0, 317)}…` : input.questionText;

  const readingInstruction = input.section === "reading" && !input.skill.startsWith("writing-")
    ? `This is a READING question. In addition to the explanation, identify the exact sentence in the passage that proves the correct answer and include it as "passageEvidence": { "text": "the exact sentence from the passage" }.`
    : "";

  const grammarInstruction = input.skill.startsWith("writing-")
    ? `This is a GRAMMAR question. State the grammar rule in simple terms, show why the student's choice broke it, and give a quick test they can use next time.`
    : "";

  return `You are a calm SAT tutor for "1600". A student got this question wrong. Write a short, clear explanation. Use plain language. No jargon.

${grammarInstruction}
${readingInstruction}

Return JSON only:
{
  "whyWrong": "1-2 sentences: what they picked, what's correct, and why — in plain words.",
  "simpleExplanation": "2-3 sentences: walk through the solution step by step.",
  "rememberNextTime": "1 short tip to remember before picking next time.",
  "practiceNext": "1 specific thing to practice next.",
  "solutionSteps": ["Step 1", "Step 2", "Step 3"]
}
${input.section === "reading" && !input.skill.startsWith("writing-") ? `  "passageEvidence": { "text": "exact passage sentence proving the answer" }` : ""}

Question (${input.section}, ${input.skill}): ${q}
Student picked: ${input.selectedAnswer}
Correct answer: ${input.correctAnswer}
Core concept: ${input.underlyingConcept.slice(0, 200)}
Original explanation: ${input.explanation.slice(0, 500)}
${input.formulaOrRule ? `Rule: ${input.formulaOrRule.slice(0, 160)}` : ""}`;
}
