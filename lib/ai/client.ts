import "server-only";

const GROQ_BASE = "https://api.groq.com/openai/v1";
const GROQ_MODELS = ["openai/gpt-oss-20b", "groq/compound-mini", "qwen/qwen3.6-27b"];

function apiKey() {
  return process.env.AI_API_KEY?.trim() || "";
}

export function isAiConfigured() {
  return Boolean(apiKey());
}

function isGroqKey(key: string) {
  return key.startsWith("gsk_");
}

function endpoint() {
  const key = apiKey();
  const configured = process.env.AI_BASE_URL?.trim();
  const base = (configured || (isGroqKey(key) ? GROQ_BASE : "https://api.openai.com/v1")).replace(/\/$/, "");
  return `${base}/chat/completions`;
}

function modelsToTry() {
  const preferred = process.env.AI_MODEL?.trim();
  const fallbacks = isGroqKey(apiKey()) ? GROQ_MODELS : ["gpt-4o-mini", "gpt-4.1-mini", ...GROQ_MODELS];
  return [...new Set(preferred ? [preferred, ...fallbacks] : fallbacks)];
}

function parseAiError(text: string, status: number) {
  try {
    const json = JSON.parse(text) as { error?: { message?: string; code?: string } };
    const message = json.error?.message ?? "";
    if (/incorrect api key|invalid api key|authentication|invalid_api_key/i.test(message)) {
      return "The AI API key was rejected. Check AI_API_KEY in .env.";
    }
    if (/quota|billing|insufficient|credits remaining/i.test(message)) {
      return "The AI account has no remaining credit or quota.";
    }
    if (/model/i.test(message) && /not found|does not exist|access|decommissioned/i.test(message)) {
      return "This API key cannot use the configured AI model.";
    }
    if (message) return message.slice(0, 180);
  } catch {
    /* use status fallback */
  }
  if (status === 401) return "The AI API key was rejected. Check AI_API_KEY in .env.";
  if (status === 429) return "The AI service is rate-limited. Try again in a moment.";
  return `AI request failed (${status}).`;
}

async function requestCompletion(model: string, system: string, user: string, jsonMode: boolean) {
  const body: Record<string, unknown> = {
    model,
    temperature: 0.2,
    messages: [
      { role: "system", content: jsonMode ? `${system}\nReturn valid JSON only.` : system },
      { role: "user", content: user },
    ],
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  return fetch(endpoint(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function complete(system: string, user: string, jsonMode: boolean): Promise<string | null> {
  const key = apiKey();
  if (!key) return null;

  let lastError = "AI request failed.";
  for (const model of modelsToTry()) {
    for (const useJson of jsonMode ? [true, false] : [false]) {
      const response = await requestCompletion(model, system, user, useJson);
      if (!response.ok) {
        lastError = parseAiError(await response.text(), response.status);
        if (/model/i.test(lastError) || /json|response_format/i.test(lastError)) continue;
        throw new Error(lastError);
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = payload.choices?.[0]?.message?.content;
      if (content) return content;
    }
  }

  throw new Error(lastError);
}

export async function completeJson<T>(system: string, user: string): Promise<T | null> {
  const content = await complete(system, user, true);
  if (!content) return null;
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  const json = start >= 0 && end > start ? content.slice(start, end + 1) : content;
  return JSON.parse(json) as T;
}

export async function completeText(system: string, user: string): Promise<string | null> {
  return complete(system, user, false);
}
