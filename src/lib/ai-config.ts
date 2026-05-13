/**
 * Shared AI configuration for all API routes.
 * Change model or parameters in one place.
 */

export const AI_MODEL = "google/gemini-2.5-flash";

export const AI_SETTINGS = {
  chat: { temperature: 0.9, max_tokens: 1000 },
  generate: { temperature: 0.85, max_tokens: 700 },
  evaluate: { temperature: 0.3, max_tokens: 300 },
} as const;

/** Max characters of transcript to include in prompts */
export const TRANSCRIPT_LIMIT = 3000;

/** Rate limits per route: [max requests, window in ms] */
export const RATE_LIMITS = {
  chat: { limit: 20, windowMs: 60_000 },
  generate: { limit: 10, windowMs: 60_000 },
  evaluate: { limit: 10, windowMs: 60_000 },
} as const;

/** Throws early if the API key is missing */
export function requireApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }
  return key;
}

/** Fire-and-forget usage logging — never blocks the response */
export function logUsage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  data: {
    route: "chat" | "generate" | "evaluate";
    paragraph_id: string;
    difficulty?: number;
    question_type?: string;
    score?: string;
  }
): void {
  Promise.resolve(supabase.from("ai_usage").insert(data)).catch(() => {/* silent */});
}
