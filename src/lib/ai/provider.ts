type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function hasOpenRouter() {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

function hasGemini() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function isAiConfigured(): boolean {
  return hasOpenRouter() || hasGemini();
}

function fastModel(): string {
  return (
    process.env.AI_FAST_MODEL?.trim() ||
    process.env.OPENROUTER_MODEL?.trim() ||
    process.env.GEMINI_MODEL?.trim() ||
    "google/gemini-2.0-flash-001"
  );
}

function strongModel(): string {
  return (
    process.env.AI_STRONG_MODEL?.trim() ||
    process.env.OPENROUTER_MODEL?.trim() ||
    process.env.GEMINI_MODEL?.trim() ||
    "google/gemini-2.0-flash-001"
  );
}

async function chatOpenRouter(
  messages: ChatMessage[],
  maxTokens: number,
  model: string
): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY!.trim();
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": site,
      "X-Title": "1600",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.35,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter: ${res.status} ${err.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

async function chatGemini(messages: ChatMessage[], maxTokens: number, model: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY!.trim();

  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const userParts = messages.filter((m) => m.role === "user").map((m) => m.content);
  const prompt = [system, ...userParts].filter(Boolean).join("\n\n");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.35 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini: ${res.status} ${err.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

async function chat(messages: ChatMessage[], maxTokens: number, model: string): Promise<string> {
  const prefer = process.env.AI_PROVIDER?.trim();
  if (prefer === "gemini" && hasGemini()) return chatGemini(messages, maxTokens, model);
  if (prefer === "openrouter" && hasOpenRouter()) return chatOpenRouter(messages, maxTokens, model);
  if (hasOpenRouter()) return chatOpenRouter(messages, maxTokens, model);
  if (hasGemini()) return chatGemini(messages, maxTokens, model);
  throw new Error("No AI API key configured. Add OPENROUTER_API_KEY or GEMINI_API_KEY to .env.local");
}

/** Cheaper/faster model — summaries, simpler explanations, tagging */
export async function generateTextFast(messages: ChatMessage[], maxTokens = 300): Promise<string> {
  try {
    if (!isAiConfigured()) return "";
    return await chat(messages, maxTokens, fastModel());
  } catch {
    return "";
  }
}

/** Stronger model — tutoring, difficult concepts, content generation */
export async function generateTextStrong(messages: ChatMessage[], maxTokens = 600): Promise<string> {
  try {
    if (!isAiConfigured()) return "";
    return await chat(messages, maxTokens, strongModel());
  } catch {
    return "";
  }
}

export async function generateText(
  messages: ChatMessage[],
  maxTokens = 600
): Promise<string> {
  return generateTextStrong(messages, maxTokens);
}
