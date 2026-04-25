import { createServerFn } from "@tanstack/react-start";
import {
  copilotIntentRequestSchema,
  CopilotStructuredIntentSchema,
  type CopilotStructuredIntent,
} from "./copilot-intent-schema";

function openAiKey(): string | undefined {
  if (typeof process !== "undefined" && process.env.OPENAI_API_KEY) {
    const k = process.env.OPENAI_API_KEY.trim();
    if (k) return k;
  }
  return undefined;
}

const SYSTEM_PROMPT = `You extract siting intent for a California clean-energy map demo. Layers are mock geometry only (not engineering advice).

Return one JSON object with ONLY these keys:
- acres: positive number (site footprint size in acres; typical 20–500).
- maxRisk: number 0–100 meaning the user’s acceptable siting score ceiling (lower score is better in the UI).
- shapeKind: "circle" | "square" | "hexagon".
- placeQuery: string or null — a California city, neighborhood, or short place phrase; null if statewide / no specific place.
- layerFocus: array of zero or more of "transmission" | "wildfire" | "equity" | "grid" | "power_plants". Empty array means consider all of those layers.
- mentionsWind: boolean — true when the user is asking about wind turbines, wind risk, or wind farm siting (and not primarily about solar).
- summary: optional short phrase (≤200 chars) describing the interpreted goal for logs.

If unsure, prefer null placeQuery, empty layerFocus, mentionsWind false, acres 50, maxRisk 35, shapeKind "circle".`;

export type ParseCopilotIntentResult =
  | { ok: true; intent: CopilotStructuredIntent }
  | {
      ok: false;
      code:
        | "missing_openai_key"
        | "openai_http_error"
        | "openai_network_error"
        | "openai_invalid_json"
        | "intent_schema_error";
      status?: number;
    };

export const parseCopilotIntentFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => copilotIntentRequestSchema.parse(d))
  .handler(async ({ data }): Promise<ParseCopilotIntentResult> => {
    const apiKey = openAiKey();
    if (!apiKey) return { ok: false, code: "missing_openai_key" };

    let content: string;
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.15,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: data.command },
          ],
        }),
      });
      if (!res.ok) {
        return { ok: false, code: "openai_http_error", status: res.status };
      }
      const body = (await res.json()) as {
        choices?: { message?: { content?: string | null } }[];
      };
      content = body.choices?.[0]?.message?.content ?? "";
    } catch {
      return { ok: false, code: "openai_network_error" };
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(content) as unknown;
    } catch {
      return { ok: false, code: "openai_invalid_json" };
    }

    const parsed = CopilotStructuredIntentSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return { ok: false, code: "intent_schema_error" };
    }
    return { ok: true, intent: parsed.data };
  });
