type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "openai/gpt-4o-mini";

export function isLlmConfigured(): boolean {
  return Boolean(llmConfig().apiKey);
}

export function llmConfig() {
  const apiKey =
    process.env.OPENROUTER_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    "";
  const baseUrl = (
    process.env.OPENROUTER_BASE_URL?.trim() ||
    process.env.OPENAI_BASE_URL?.trim() ||
    OPENROUTER_BASE
  ).replace(/\/+$/, "");
  const model =
    process.env.OPENROUTER_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    DEFAULT_MODEL;

  return { apiKey, baseUrl, model };
}

/** OpenRouter (OpenAI-compatible) chat completion. */
export async function chatJson(params: {
  messages: ChatMessage[];
  temperature?: number;
  timeoutMs?: number;
}): Promise<{ text: string; model: string }> {
  const { apiKey, baseUrl, model } = llmConfig();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    params.timeoutMs ?? 45_000
  );

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": appUrl,
        "X-Title": "NewNagarik",
      },
      body: JSON.stringify({
        model,
        temperature: params.temperature ?? 0.4,
        response_format: { type: "json_object" },
        messages: params.messages,
      }),
      signal: controller.signal,
    });

    const json = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
      model?: string;
    };

    if (!response.ok) {
      throw new Error(
        json.error?.message ?? `LLM request failed (${response.status})`
      );
    }

    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new Error("LLM returned an empty response.");
    }

    return { text, model: json.model ?? model };
  } finally {
    clearTimeout(timer);
  }
}

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Could not parse LLM JSON.");
  }
}
