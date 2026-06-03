import type { PhasePlan, Question, ReadingPassageMeta } from "./types";

type ReadingSet = {
  groupId: string;
  passage: ReadingPassageMeta & { passageText: string };
  questions: Array<{
    skill: string;
    difficulty: number;
    estimatedTime: number;
    questionText: string;
    choices: string[];
    correctAnswer: string;
    explanation: string;
    conceptExplanation: string;
  }>;
};

const COMMUNITY_GARDENS_PASSAGE = `(1) When Maya moved to the city, she missed the quiet mornings she had known in her hometown. (2) She discovered a small community garden two blocks from her apartment, where neighbors traded tomatoes, herbs, and advice. (3) At first, she visited only to escape the noise of traffic, but soon she began helping plan weekend workshops for students. (4) The garden became a place where people who rarely spoke on the sidewalk now shared tools and stories. (5) Maya realized that green spaces in dense neighborhoods do more than grow food—they grow connection.`;

const OBSERVATORY_PASSAGE = `(1) Dr. Chen kept a notebook beside the telescope, recording not only star positions but also the questions visitors asked during public nights. (2) Many children wanted to know whether the lights they saw were planets or distant suns. (3) Chen answered patiently, knowing that a single clear explanation could change how someone saw the night sky for years. (4) She believed astronomy was less about memorizing names and more about learning to notice patterns. (5) By the end of each evening, the notebook was filled with sketches, arrows, and reminders to follow up with school groups.`;

const FORENSICS_PASSAGE = `(1) Detective Marquez examined the footprint left in the damp soil near the window. (2) It was deep at the heel and shallow at the toe, suggesting someone had been running—not walking—toward the house. (3) The stride length was uneven, as if the person had been limping or carrying something heavy. (4) Next to it was a partial print from a different shoe, much smaller, placed carefully as if trying not to disturb the ground. (5) Marquez photographed both and noted that the smaller print ended abruptly at the driveway, where tire tracks began.`;

const SOLAR_PANELS_PASSAGE = `(1) The town of Millbrook installed solar panels on the roof of its middle school in 2021, expecting to save twelve thousand dollars per year in electricity costs. (2) By the end of the first year, the savings exceeded projections by nearly forty percent because the panels generated more power than expected during the summer months. (3) The school used the surplus to power its evening adult education program at no additional cost. (4) Inspired by the results, the town council voted to install panels on the library and community center the following year. (5) A local nonprofit calculated that the combined installations would offset the equivalent of planting four thousand trees annually.`;

const SONGWRITER_PASSAGE = `(1) For years, Nina believed that songwriting required a flash of inspiration—a sudden, perfect melody arriving without warning. (2) She waited for these moments, spending weeks staring at blank pages. (3) During a residency at a small studio, she met an older musician who wrote for two hours every morning, whether the ideas came easily or not. (4) Skeptical at first, Nina tried the routine and discovered that most of what she wrote was ordinary, but buried in the ordinary pages were phrases she would never have found by waiting. (5) She learned that creativity was not a lightning strike but a daily practice of showing up and sifting through the results.`;

export const READING_SETS: ReadingSet[] = [
  {
    groupId: "community-gardens",
    passage: {
      passageText: COMMUNITY_GARDENS_PASSAGE,
      difficulty: 2,
      tone: "Warm, reflective",
      topic: "Urban community gardens",
      readingSkill: "reading-main-idea",
      estimatedReadSeconds: 90,
    },
    questions: [
      {
        skill: "reading-main-idea",
        difficulty: 2,
        estimatedTime: 90,
        questionText: "What is the main idea of the passage?",
        choices: [
          "City gardens are too small to be useful.",
          "Community gardens can help neighbors build relationships.",
          "Maya prefers rural life to city life.",
          "Workshops are the only reason gardens succeed.",
        ],
        correctAnswer: "Community gardens can help neighbors build relationships.",
        explanation:
          "The passage shows Maya finding connection through the garden, ending with the idea that green spaces grow connection.",
        conceptExplanation:
          "Main idea questions ask what the whole passage is mostly about—not one small detail.",
      },
      {
        skill: "reading-evidence",
        difficulty: 3,
        estimatedTime: 100,
        questionText:
          "Which lines best support the idea that the garden helped people who did not know each other before?",
        choices: ["Lines 1-2", "Lines 3-4", "Lines 4-5", "Lines 1-5"],
        correctAnswer: "Lines 3-4",
        explanation:
          "Lines 3-4 describe neighbors who rarely spoke now sharing tools and stories.",
        conceptExplanation:
          "Evidence questions point to lines that prove a specific claim.",
      },
      {
        skill: "reading-vocabulary",
        difficulty: 2,
        estimatedTime: 75,
        questionText: 'As used in line 2, "traded" most nearly means —',
        choices: ["sold for money", "exchanged", "gambled", "hid"],
        correctAnswer: "exchanged",
        explanation: "Neighbors share tomatoes and herbs—they exchange goods.",
        conceptExplanation: "Use nearby context, not the most common definition.",
      },
    ],
  },
  {
    groupId: "observatory",
    passage: {
      passageText: OBSERVATORY_PASSAGE,
      difficulty: 3,
      tone: "Curious, thoughtful",
      topic: "Public astronomy",
      readingSkill: "reading-inference",
      estimatedReadSeconds: 100,
    },
    questions: [
      {
        skill: "reading-inference",
        difficulty: 3,
        estimatedTime: 100,
        questionText: "Based on the passage, what can be inferred about Dr. Chen?",
        choices: [
          "She dislikes speaking with visitors.",
          "She values teaching people how to think scientifically.",
          "She only records data for other scientists.",
          "She believes memorizing star names is the main goal.",
        ],
        correctAnswer: "She values teaching people how to think scientifically.",
        explanation: "Chen focuses on patterns and questions, not memorization.",
        conceptExplanation: "Inference = a reasonable conclusion supported by the text.",
      },
      {
        skill: "reading-main-idea",
        difficulty: 2,
        estimatedTime: 90,
        questionText: "The passage mainly suggests that public astronomy nights —",
        choices: [
          "should be limited to experts",
          "can spark long-term curiosity in visitors",
          "are too noisy for careful work",
          "replace formal classroom instruction",
        ],
        correctAnswer: "can spark long-term curiosity in visitors",
        explanation: "One clear explanation can change how someone sees the sky for years.",
        conceptExplanation: "Look for what the author emphasizes across the whole passage.",
      },
    ],
  },
  {
    groupId: "forensics",
    passage: {
      passageText: FORENSICS_PASSAGE,
      difficulty: 3,
      tone: "Analytical, methodical",
      topic: "Forensic evidence analysis",
      readingSkill: "reading-inference",
      estimatedReadSeconds: 100,
    },
    questions: [
      {
        skill: "reading-inference",
        difficulty: 3,
        estimatedTime: 100,
        questionText: "Based on the passage, what most likely happened before Marquez arrived?",
        choices: [
          "Someone walked carefully to the driveway and drove away.",
          "Two people approached the house, one running and one walking carefully.",
          "A single person ran to the window then walked to the driveway.",
          "The smaller print belongs to someone who ran toward the house.",
        ],
        correctAnswer: "Two people approached the house, one running and one walking carefully.",
        explanation: "Two distinct shoe prints with different stride patterns suggest two people.",
        conceptExplanation: "Combine multiple pieces of evidence to infer what happened.",
      },
      {
        skill: "reading-main-idea",
        difficulty: 2,
        estimatedTime: 85,
        questionText: "The primary purpose of the passage is to —",
        choices: [
          "explain how detectives solve crimes",
          "describe a scene being investigated",
          "argue that footprint analysis is unreliable",
          "compare running and walking stride patterns",
        ],
        correctAnswer: "describe a scene being investigated",
        explanation: "The passage presents physical evidence at a crime scene without conclusions.",
        conceptExplanation: "Main purpose questions ask why the author wrote this specific passage.",
      },
      {
        skill: "reading-vocabulary",
        difficulty: 2,
        estimatedTime: 70,
        questionText: 'As used in line 4, "partial" most nearly means —',
        choices: ["biased", "incomplete", "fragmented", "unfinished"],
        correctAnswer: "incomplete",
        explanation: "A partial print means only part of the footprint is visible.",
        conceptExplanation: "Use context: the print ends abruptly, so it is incomplete.",
      },
    ],
  },
  {
    groupId: "solar-panels",
    passage: {
      passageText: SOLAR_PANELS_PASSAGE,
      difficulty: 2,
      tone: "Informative, factual",
      topic: "Renewable energy in schools",
      readingSkill: "reading-main-idea",
      estimatedReadSeconds: 85,
    },
    questions: [
      {
        skill: "reading-main-idea",
        difficulty: 2,
        estimatedTime: 85,
        questionText: "What is the main idea of the passage?",
        choices: [
          "Solar panels are too expensive for most schools.",
          "Millbrook's solar panels exceeded expectations and led to further adoption.",
          "Summer months are the best time for solar energy generation.",
          "Adult education programs depend on solar power.",
        ],
        correctAnswer: "Millbrook's solar panels exceeded expectations and led to further adoption.",
        explanation: "The passage shows exceeded projections, cost savings, and expansion to other buildings.",
        conceptExplanation: "Identify the overarching outcome, not just one detail.",
      },
      {
        skill: "reading-evidence",
        difficulty: 3,
        estimatedTime: 95,
        questionText: "Which line best supports the claim that the solar panels were more effective than planned?",
        choices: ["Line 1-2", "Lines 2-3", "Lines 3-4", "Lines 4-5"],
        correctAnswer: "Lines 2-3",
        explanation: "The savings exceeded projections by nearly forty percent.",
        conceptExplanation: "Evidence must directly prove the quantitative claim made.",
      },
    ],
  },
  {
    groupId: "songwriter",
    passage: {
      passageText: SONGWRITER_PASSAGE,
      difficulty: 2,
      tone: "Reflective, instructive",
      topic: "Creative process and discipline",
      readingSkill: "reading-inference",
      estimatedReadSeconds: 95,
    },
    questions: [
      {
        skill: "reading-inference",
        difficulty: 3,
        estimatedTime: 100,
        questionText: "What can be inferred about the older musician mentioned in the passage?",
        choices: [
          "He believed creativity required waiting for inspiration.",
          "He had learned that regular practice produces better work.",
          "He thought Nina's songs were ordinary.",
          "He only wrote when ideas came easily.",
        ],
        correctAnswer: "He had learned that regular practice produces better work.",
        explanation: "He wrote daily regardless of inspiration, showing discipline as the key.",
        conceptExplanation: "Inferences must be directly supported by the text.",
      },
      {
        skill: "reading-main-idea",
        difficulty: 2,
        estimatedTime: 85,
        questionText: "The passage mainly suggests that creativity —",
        choices: [
          "cannot be learned or practiced",
          "depends on having the right environment",
          "is developed through consistent effort",
          "comes only to naturally gifted people",
        ],
        correctAnswer: "is developed through consistent effort",
        explanation: "Nina found that daily practice produced ideas that waiting never did.",
        conceptExplanation: "Look for what the author concludes from the character's experience.",
      },
      {
        skill: "reading-vocabulary",
        difficulty: 2,
        estimatedTime: 70,
        questionText: 'As used in line 5, "ordinary" most nearly means —',
        choices: ["unremarkable", "typical", "traditional", "expected"],
        correctAnswer: "unremarkable",
        explanation: "Nina found most of what she wrote was not special or outstanding.",
        conceptExplanation: "The context contrasts ordinary with the buried useful phrases.",
      },
    ],
  },
];

const BROKEN_PROMPT_MARKERS = [
  "previous question",
  "as used in line",
  "first paragraph is to",
  "inference is best supported by the passage",
];

export function isBrokenReadingQuestion(q: Question): boolean {
  if (q.section !== "reading") return false;
  if (q.passage?.passageText?.trim()) return false;
  const t = q.questionText.toLowerCase();
  return BROKEN_PROMPT_MARKERS.some((m) => t.includes(m));
}

export function isPlayableReadingQuestion(q: Question): boolean {
  if (q.section !== "reading") return true;
  if (q.skill.startsWith("writing-")) return true;
  return Boolean(q.passage?.passageText?.trim());
}

export function isPassageReadingQuestion(q: Question): boolean {
  return q.section === "reading" && !q.skill.startsWith("writing-");
}

function buildReadingSetQuestions(): Question[] {
  const extras: Question[] = [];
  for (const set of READING_SETS) {
    set.questions.forEach((template, idx) => {
      extras.push({
        id: `reading-set-${set.groupId}-${idx}`,
        testType: "sat",
        section: "reading",
        skill: template.skill,
        subskill: set.groupId,
        difficulty: template.difficulty,
        questionText: template.questionText,
        choices: template.choices,
        correctAnswer: template.correctAnswer,
        explanation: template.explanation,
        conceptExplanation: template.conceptExplanation,
        formulaOrRule: null,
        formulaLatex: null,
        underlyingConcept: null,
        commonMistakes: [],
        mistakeTypes: ["misread"],
        estimatedTime: template.estimatedTime,
        passage: { ...set.passage },
        status: "active",
        prompt: template.questionText,
        skill_tag: template.skill,
        correct_answer: template.correctAnswer,
        estimated_seconds: template.estimatedTime,
      });
    });
  }
  return extras;
}

function legacyPatchForQuestion(q: Question): Question | null {
  if (q.section !== "reading" || q.passage?.passageText) return null;
  const t = q.questionText.toLowerCase();

  for (const set of READING_SETS) {
    for (const template of set.questions) {
      if (t.includes("evidence") && template.skill === "reading-evidence") {
        return applyTemplate(q, set, template);
      }
      if (t.includes("main purpose") && template.skill === "reading-main-idea") {
        return applyTemplate(q, set, template);
      }
      if (t.includes("reserved") && template.skill === "reading-vocabulary") {
        return applyTemplate(q, set, template);
      }
      if (t.includes("inference") && template.skill === "reading-inference") {
        return applyTemplate(q, set, template);
      }
    }
  }
  return null;
}

function applyTemplate(
  q: Question,
  set: ReadingSet,
  template: ReadingSet["questions"][number]
): Question {
  return {
    ...q,
    questionText: template.questionText,
    choices: template.choices,
    correctAnswer: template.correctAnswer,
    explanation: template.explanation,
    conceptExplanation: template.conceptExplanation,
    skill: template.skill,
    skill_tag: template.skill,
    subskill: set.groupId,
    difficulty: template.difficulty,
    estimatedTime: template.estimatedTime,
    estimated_seconds: template.estimatedTime,
    passage: { ...set.passage },
  };
}

export function enrichQuestionBank(questions: Question[]): Question[] {
  return questions.map((q) => {
    if (isBrokenReadingQuestion(q)) {
      const patched = legacyPatchForQuestion(q);
      if (patched) return patched;
      return { ...q, status: "draft" as const };
    }
    if (q.section === "reading" && !q.passage?.passageText) {
      const patched = legacyPatchForQuestion(q);
      if (patched) return patched;
    }
    return q;
  });
}

export function filterPlayableQuestions(questions: Question[]): Question[] {
  return enrichQuestionBank(questions).filter((q) => {
    if (q.status === "draft") return false;
    if (q.section !== "reading") return true;
    return isPlayableReadingQuestion(q);
  });
}

export function expandBankWithReadingSets(questions: Question[]): Question[] {
  const enriched = enrichQuestionBank(questions);
  const readingSets = buildReadingSetQuestions();
  const nonPassageReading = enriched.filter(
    (q) => !isPassageReadingQuestion(q) || q.skill.startsWith("writing-")
  );
  return [...nonPassageReading, ...readingSets];
}

export function prepareSessionBank(allQuestions: Question[]): Question[] {
  const active = allQuestions.filter((q) => q.status !== "draft");
  const enriched = enrichQuestionBank(active.length ? active : allQuestions);
  return expandBankWithReadingSets(enriched).filter((q) => {
    if (q.status === "draft") return false;
    if (q.section !== "reading") return true;
    return isPlayableReadingQuestion(q);
  });
}

export function passageGroupId(q: Question): string | null {
  if (q.subskill) return q.subskill;
  if (q.passage?.topic) return `topic-${q.passage.topic}`;
  return null;
}

export function pickReadingSet(pool: Question[], used: Set<string>, count = 2): Question[] {
  const reading = pool.filter(
    (q) =>
      q.id.startsWith("reading-set-") &&
      isPlayableReadingQuestion(q) &&
      !used.has(q.id)
  );
  if (!reading.length) return [];

  const byGroup = new Map<string, Question[]>();
  for (const q of reading) {
    const gid = passageGroupId(q) ?? q.id;
    const list = byGroup.get(gid) ?? [];
    list.push(q);
    byGroup.set(gid, list);
  }

  const groups = [...byGroup.values()].filter((g) => g.length >= 1);
  if (!groups.length) return [];

  const picked = groups[Math.floor(Math.random() * groups.length)];
  const ordered = [...picked].sort((a, b) => a.id.localeCompare(b.id)).slice(0, Math.min(count, picked.length));
  for (const q of ordered) used.add(q.id);
  return ordered;
}

/** Drop broken legacy reading IDs from a phase plan and inject full passage sets. */
export function repairReadingInPhasePlan(plan: PhasePlan, bank: Question[]): PhasePlan {
  const bankById = new Map(bank.map((q) => [q.id, q]));
  const used = new Set<string>();

  const collectUsed = (ids: string[]) => {
    for (const id of ids) used.add(id);
  };
  collectUsed(plan.warmup);
  collectUsed(plan.focus);
  collectUsed(plan.timed);
  collectUsed(plan.mixed);
  collectUsed(plan.mistakes);

  const fix = (ids: string[], allowReadingSet: boolean): string[] => {
    const hadLegacyReading = ids.some((id) => {
      const q = bankById.get(id);
      return q && isPassageReadingQuestion(q) && !id.startsWith("reading-set-");
    });

    const out = ids.filter((id) => {
      const q = bankById.get(id);
      if (q && isPassageReadingQuestion(q) && !id.startsWith("reading-set-")) return false;
      if (q && isPassageReadingQuestion(q) && !isPlayableReadingQuestion(q)) return false;
      return bankById.has(id) || id.startsWith("reading-set-");
    });

    if (allowReadingSet && hadLegacyReading) {
      const replacement = pickReadingSet(bank, used, 2);
      if (replacement.length) out.push(...replacement.map((r) => r.id));
    }

    return out;
  };

  return {
    warmup: fix(plan.warmup, false),
    focus: fix(plan.focus, true),
    timed: fix(plan.timed, true),
    mixed: fix(plan.mixed, true),
    mistakes: fix(plan.mistakes, false),
    takeaway: plan.takeaway,
    complete: plan.complete,
  };
}

/** Resolve phase plan IDs to full question objects (DB + embedded reading sets). */
export function resolveSessionQuestions(
  ids: string[],
  dbQuestions: Question[]
): Record<string, Question> {
  const enriched = enrichQuestionBank(dbQuestions);
  const bank = prepareSessionBank(enriched);
  const bankById = new Map(bank.map((q) => [q.id, q]));
  const out: Record<string, Question> = {};

  for (const id of ids) {
    const fromBank = bankById.get(id);
    if (fromBank) {
      out[id] = fromBank;
      continue;
    }
    const fromDb = enriched.find((q) => q.id === id);
    if (fromDb && isPlayableReadingQuestion(fromDb)) {
      out[id] = fromDb;
    }
  }
  return out;
}
