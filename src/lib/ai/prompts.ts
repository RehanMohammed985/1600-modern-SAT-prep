export function simplerExplanationPrompt(input: {
  questionText: string;
  explanation: string;
  skill: string;
  section: string;
}): string {
  return `You are a calm SAT tutor. Rewrite this explanation for a high school student who is stuck.
Use short sentences. No jargon. Max 4 sentences.

Section: ${input.section}
Skill: ${input.skill}
Question: ${input.questionText}
Original explanation: ${input.explanation}`;
}

export function sessionSummaryPrompt(input: {
  focusSkill: string;
  weakSkills: string[];
  mistakes: string[];
}): string {
  return `Write 3 short bullet takeaways for a student after a study session.
Tone: encouraging, specific, no fluff.

Focus skill: ${input.focusSkill}
Weak skills: ${input.weakSkills.join(", ") || "none yet"}
Common misses: ${input.mistakes.join("; ") || "none"}`;
}

export function similarQuestionPrompt(input: {
  skill: string;
  section: string;
  difficulty: number;
  exampleQuestion: string;
}): string {
  return `Create one new SAT-style ${input.section} practice question.
Skill: ${input.skill}
Difficulty 1-5: ${input.difficulty}
Match the style of this example but change numbers/context:
${input.exampleQuestion}

Return JSON only: {"questionText":"","choices":["A) ...","B) ...","C) ...","D) ..."],"correctAnswer":"A) ...","explanation":"..."}`;
}

export function readingPassagePrompt(input: {
  topic: string;
  tone: string;
  difficulty: number;
  readingSkill: string;
}): string {
  return `Write a short SAT reading passage (120-180 words) and one multiple-choice question.
Topic: ${input.topic}
Tone: ${input.tone}
Difficulty: ${input.difficulty}/5
Reading skill tested: ${input.readingSkill}

Return JSON: {"passageText":"","questionText":"","choices":[],"correctAnswer":"","explanation":"","estimatedReadSeconds":90}`;
}
