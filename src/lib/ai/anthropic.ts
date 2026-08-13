import Anthropic from "@anthropic-ai/sdk";

export function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

export const AI_UNAVAILABLE_MESSAGE = "AI機能は現在利用できません（ANTHROPIC_API_KEYが未設定です）";

/** Extracts the text content from a Messages API response. */
export function extractText(msg: Anthropic.Message): string {
  return msg.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

/** Strips ```json / ``` fences the model sometimes wraps JSON output in, then parses it. */
export function parseJsonResponse<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned) as T;
}
