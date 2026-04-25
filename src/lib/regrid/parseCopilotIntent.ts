import { createServerFn } from "@tanstack/react-start";
import {
  copilotIntentRequestSchema,
  CopilotStructuredIntentSchema,
  type CopilotStructuredIntent,
} from "./copilot-intent-schema";

const ANTHROPIC_VERSION = "2023-06-01";
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

/** Anthropic sometimes wraps JSON in a markdown fence; strip it for JSON.parse. */
function stripJsonFence(text: string): string {
  const t = text.trim();
  const fenced = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1]!.trim();
  return t;
}

const SYSTEM_PROMPT = `You extract siting intent for a California clean-energy map demo called ReGrid.

Hard rules:
- The map uses synthetic / demo geometry only. It is NOT live federal data, NOT engineering, NOT permits.
- You must never imply a real-world "best site" or certified lowest-risk outcome was computed.

Return one JSON object only (no markdown fences, no commentary) with these keys:
- acres: positive number (footprint size in acres; typical 20–500).
- maxRisk: number 0–100 = acceptable siting score ceiling in the UI (lower score is better).
- shapeKind: "circle" | "square" | "hexagon".
- placeQuery: string or null — California place phrase; null if statewide / unclear.
- layerFocus: array of zero or more of "transmission" | "wildfire" | "equity" | "grid" | "power_plants". Empty array means all of those matter equally for this demo.
- mentionsWind: boolean — true for wind siting / wind risk wording (and not primarily solar).
- summary: optional ≤200 chars for developer-style logs.
- simpleAnswer: required string, 2–4 short sentences, plain English, for the end user. It must:
  (1) restate what they asked in one clause,
  (2) say clearly this is a demo map and scores depend on which layers are on,
  (3) avoid promising real lowest-risk or regulatory conclusions.

If unsure: placeQuery null, empty layerFocus, mentionsWind false, acres 50, maxRisk 35, shapeKind "circle", and still include simpleAnswer.`;

export type ParseCopilotIntentResult =
  | { ok: true; intent: CopilotStructuredIntent }
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
          max_tokens: 2048,
          temperature: 0.2,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `User siting request (verbatim):\n${data.command}`,
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
