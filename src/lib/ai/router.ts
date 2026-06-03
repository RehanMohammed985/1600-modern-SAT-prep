export type AiTaskType =
  | "simple_explanation"
  | "mistake_classification"
  | "question_generation"
  | "tutoring_review"
  | "study_plan_generation"
  | "session_summary"
  | "similar_question"
  | "knowledge_tracing"
  | "score_prediction"
  | "question_routing"
  | "passage_generation"
  | "concept_explanation";

export type ModelTier = "fast" | "medium" | "strong";

export type AiRouteConfig = {
  tier: ModelTier;
  provider: "openrouter" | "gemini" | "deterministic";
  model: string;
  maxTokens: number;
  temperature: number;
  description: string;
};

const ROUTE_MAP: Record<AiTaskType, AiRouteConfig> = {
  simple_explanation: {
    tier: "fast",
    provider: "gemini",
    model: "gemini-2.0-flash",
    maxTokens: 300,
    temperature: 0.3,
    description: "Short, simple rewrites of explanations",
  },
  mistake_classification: {
    tier: "fast",
    provider: "gemini",
    model: "gemini-2.0-flash",
    maxTokens: 100,
    temperature: 0.2,
    description: "Classify mistake types from student responses",
  },
  question_generation: {
    tier: "strong",
    provider: "openrouter",
    model: "google/gemini-2.0-flash-001",
    maxTokens: 2200,
    temperature: 0.4,
    description: "Generate full SAT question packs from blueprints",
  },
  tutoring_review: {
    tier: "strong",
    provider: "openrouter",
    model: "google/gemini-2.0-flash-001",
    maxTokens: 600,
    temperature: 0.3,
    description: "Personalized tutoring review for wrong answers",
  },
  study_plan_generation: {
    tier: "medium",
    provider: "gemini",
    model: "gemini-2.0-flash",
    maxTokens: 800,
    temperature: 0.4,
    description: "Generate weekly study plans and recommendations",
  },
  session_summary: {
    tier: "fast",
    provider: "gemini",
    model: "gemini-2.0-flash",
    maxTokens: 400,
    temperature: 0.3,
    description: "Session takeaways and summaries",
  },
  similar_question: {
    tier: "fast",
    provider: "gemini",
    model: "gemini-2.0-flash",
    maxTokens: 600,
    temperature: 0.4,
    description: "Generate similar questions for practice",
  },
  knowledge_tracing: {
    tier: "fast",
    provider: "deterministic",
    model: "none",
    maxTokens: 0,
    temperature: 0,
    description: "Bayesian Knowledge Tracing — deterministic, no AI",
  },
  score_prediction: {
    tier: "fast",
    provider: "deterministic",
    model: "none",
    maxTokens: 0,
    temperature: 0,
    description: "Score prediction — deterministic formula",
  },
  question_routing: {
    tier: "fast",
    provider: "gemini",
    model: "gemini-2.0-flash",
    maxTokens: 150,
    temperature: 0.2,
    description: "Route questions to the right skill domain",
  },
  passage_generation: {
    tier: "strong",
    provider: "openrouter",
    model: "google/gemini-2.0-flash-001",
    maxTokens: 1500,
    temperature: 0.5,
    description: "Generate reading passages with questions",
  },
  concept_explanation: {
    tier: "medium",
    provider: "gemini",
    model: "gemini-2.0-flash",
    maxTokens: 500,
    temperature: 0.3,
    description: "Explain a SAT concept clearly",
  },
};

export function routeTask(task: AiTaskType): AiRouteConfig {
  return ROUTE_MAP[task] ?? ROUTE_MAP.simple_explanation;
}

export function isAiTask(task: AiTaskType): boolean {
  return ROUTE_MAP[task]?.provider !== "deterministic";
}

function getPreferredProvider(): "openrouter" | "gemini" {
  const prefer = process.env.AI_PROVIDER?.trim();
  if (prefer === "openrouter" && hasApiKey("openrouter")) return "openrouter";
  if (prefer === "gemini" && hasApiKey("gemini")) return "gemini";
  if (hasApiKey("openrouter")) return "openrouter";
  if (hasApiKey("gemini")) return "gemini";
  return "gemini";
}

function hasApiKey(provider: "openrouter" | "gemini"): boolean {
  if (provider === "openrouter") return Boolean(process.env.OPENROUTER_API_KEY?.trim());
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function resolveModelForTask(task: AiTaskType): {
  provider: string;
  model: string;
  maxTokens: number;
  temperature: number;
} {
  const route = routeTask(task);

  if (route.provider === "deterministic") {
    return { provider: "deterministic", model: "none", maxTokens: 0, temperature: 0 };
  }

  const preferred = getPreferredProvider();

  if (route.tier === "fast") {
    return {
      provider: preferred,
      model: process.env.AI_FAST_MODEL?.trim() ||
        (preferred === "openrouter" ? "google/gemini-2.0-flash-001" : "gemini-2.0-flash"),
      maxTokens: route.maxTokens,
      temperature: route.temperature,
    };
  }

  if (route.tier === "strong") {
    return {
      provider: preferred,
      model: process.env.AI_STRONG_MODEL?.trim() ||
        (preferred === "openrouter" ? "google/gemini-2.0-flash-001" : "gemini-2.0-flash"),
      maxTokens: route.maxTokens,
      temperature: route.temperature,
    };
  }

  return {
    provider: preferred,
    model: process.env.OPENROUTER_MODEL?.trim() || "google/gemini-2.0-flash-001",
    maxTokens: route.maxTokens,
    temperature: route.temperature,
  };
}

export function estimateTaskCost(task: AiTaskType): {
  estimatedTokens: number;
  tier: ModelTier;
} {
  const route = routeTask(task);
  return {
    estimatedTokens: route.maxTokens,
    tier: route.tier,
  };
}
