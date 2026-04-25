import { z } from "zod";

/** Raw keys the LLM must return (parsed then validated / defaulted). */
export const copilotLlmIntentSchema = z.object({
  acres: z.number().min(1).max(200_000).optional(),
  maxRisk: z.number().min(0).max(100).optional(),
  shapeKind: z.enum(["circle", "square", "hexagon"]).optional(),
  placeQuery: z.string().max(240).nullable().optional(),
  layerFocus: z
    .array(z.enum(["transmission", "wildfire", "equity", "grid", "power_plants"]))
    .optional(),
  mentionsWind: z.boolean().optional(),
  summary: z.string().max(200).optional(),
  /** Short honest reply for the user (demo limits, what the map will do). */
  simpleAnswer: z.string().max(700).optional(),
});

export type CopilotLlmIntent = z.infer<typeof copilotLlmIntentSchema>;

const defaultSimpleAnswer =
  "ReGrid will place a demo footprint in California and score it on the synthetic layers you have turned on. That score is illustrative only—not a permit study or real-world lowest-risk optimization.";

export const CopilotStructuredIntentSchema = copilotLlmIntentSchema.transform((v) => ({
  acres: v.acres ?? 50,
  maxRisk: v.maxRisk ?? 35,
  shapeKind: v.shapeKind ?? ("circle" as const),
  placeQuery: v.placeQuery === undefined ? null : v.placeQuery,
  layerFocus: v.layerFocus,
  mentionsWind: v.mentionsWind ?? false,
  summary: v.summary,
  simpleAnswer: (v.simpleAnswer?.trim() || defaultSimpleAnswer).slice(0, 700),
}));

export type CopilotStructuredIntent = z.output<typeof CopilotStructuredIntentSchema>;

export const copilotIntentRequestSchema = z.object({
  /** Kept small to limit prompt size and cost. */
  command: z.string().min(1).max(1000),
});

export type CopilotIntentRequest = z.infer<typeof copilotIntentRequestSchema>;
