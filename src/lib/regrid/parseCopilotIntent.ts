import { createServerFn } from "@tanstack/react-start";
import {
  copilotIntentRequestSchema,
  CopilotStructuredIntentSchema,
  type CopilotStructuredIntent,
} from "./copilot-intent-schema";
import { anthropicRateLimitClientKey, tryConsumeAnthropicRateToken } from "./llm-rate-limit";

const ANTHROPIC_VERSION = "2023-06-01";
/** Default: small fast model (override only if you accept higher cost). */
const DEFAULT_MODEL = "claude-3-5-haiku-20241022";

function anthropicKey(): string | undefined {
  if (typeof process !== "undefined" && process.env.ANTHROPIC_API_KEY) {
    const k = process.env.ANTHROPIC_API_KEY.trim();
    if (k) return k;
  }
  return undefined;
}

function anthropicModel(): string {
  const m = typeof process !== "undefined" ? process.env.ANTHROPIC_MODEL?.trim() : "";
  return m || DEFAULT_MODEL;
}

/** Single outbound completion; keep small (billing). */
function anthropicMaxOutputTokens(): number {
  const raw =
    typeof process !== "undefined" ? process.env.ANTHROPIC_MAX_OUTPUT_TOKENS?.trim() : undefined;
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isFinite(n)) return 384;
  return Math.min(512, Math.max(256, n));
}

function extractAssistantText(body: unknown): string {
  const b = body as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const parts = b.content ?? [];
  const texts = parts
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text!);
  return texts.join("\n").trim();
}

function stripJsonFence(text: string): string {
  const t = text.trim();
  const fenced = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1]!.trim();
  return t;
}

/** Short system text — one Anthropic call only; no follow-ups or tool loops. */
const SYSTEM_PROMPT = `ReGrid: California clean-energy siting demo. Map data is synthetic/illustrative — not permits or engineering.

Return one JSON object only (no markdown, no extra text). Keys:
- acres: number (20–500 typical)
- maxRisk: number 0–100 (UI ceiling; lower score is better)
- shapeKind: "circle"|"square"|"hexagon"
- placeQuery: string|null (CA place; null if statewide/unclear)
- layerFocus: [] or subset of "transmission","wildfire","equity","grid","power_plants" ([] = all)
- mentionsWind: boolean
- summary: string optional ≤120 chars (logs)
- simpleAnswer: string, 2–3 sentences for the user: what they asked + demo-only + no real "lowest risk" claims

If unsure: placeQuery null, layerFocus [], mentionsWind false, acres 50, maxRisk 35, shapeKind "circle".`;

export type ParseCopilotIntentResult =
  | { ok: true; intent: CopilotStructuredIntent }
  | { ok: false; code: "rate_limited"; retryAfterSec: number }
  | {
      ok: false;
      code:
        | "missing_anthropic_key"
        | "anthropic_http_error"
        | "anthropic_network_error"
        | "anthropic_invalid_json"
        | "intent_schema_error";
      status?: number;
    };

export const parseCopilotIntentFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => copilotIntentRequestSchema.parse(d))
  .handler(async ({ data }): Promise<ParseCopilotIntentResult> => {
    const apiKey = anthropicKey();
    if (!apiKey) return { ok: false, code: "missing_anthropic_key" };

    const rl = tryConsumeAnthropicRateToken(anthropicRateLimitClientKey());
    if (!rl.ok) {
      return { ok: false, code: "rate_limited", retryAfterSec: rl.retryAfterSec };
    }

    const command = data.command.slice(0, 1000);

    let content: string;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: anthropicModel(),
          max_tokens: anthropicMaxOutputTokens(),
          temperature: 0.15,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: command,
            },
          ],
        }),
      });
      if (!res.ok) {
        return { ok: false, code: "anthropic_http_error", status: res.status };
      }
      const body = await res.json();
      content = stripJsonFence(extractAssistantText(body));
    } catch {
      return { ok: false, code: "anthropic_network_error" };
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(content) as unknown;
    } catch {
      return { ok: false, code: "anthropic_invalid_json" };
    }

    const parsed = CopilotStructuredIntentSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return { ok: false, code: "intent_schema_error" };
    }
    return { ok: true, intent: parsed.data };
  });
