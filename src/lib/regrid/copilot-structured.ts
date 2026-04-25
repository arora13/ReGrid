import type { CopilotStructuredIntent } from "./copilot-intent-schema";
import type { CopilotRunHandlers, ParsedCopilotCommand } from "./copilot";
import { parseCaliforniaSubregion, runSpatialCopilotFromParsed } from "./copilot";
import { matchCaliforniaPlaceHint } from "./californiaPlaces";
import { geocodePlaceInCalifornia } from "./mapbox-geocode";
import type { LayerDef, LayerId, ShapeKind } from "./types";

const FOCUS_MAP = {
  transmission: "hifld-transmission",
  wildfire: "usda-wildfire",
  equity: "epa-ejscreen",
  grid: "eia-grid",
  power_plants: "power-plants",
} as const satisfies Record<string, LayerId>;

/** When the LLM lists layers, map to builtin ids; `null` means “use full demo stack”. */
export function layerIdsFromIntentFocus(
  intent: CopilotStructuredIntent,
  allLayers: LayerDef[],
): LayerId[] | null {
  const focus = intent.layerFocus;
  if (!focus?.length) return null;
  const builtin = new Set(
    allLayers.filter((l) => !String(l.id).startsWith("ext:")).map((l) => l.id),
  );
  const ids: LayerId[] = [];
  for (const k of focus) {
    const id = FOCUS_MAP[k];
    if (id && builtin.has(id)) ids.push(id);
  }
  return ids.length ? ids : null;
}

/** Merge LLM layer focus with user `ext:` layers; when focus is empty, enable all builtins. */
export function enabledSetFromIntentFocus(
  intent: CopilotStructuredIntent,
  allLayers: LayerDef[],
  userEnabled: Set<LayerId>,
): Set<LayerId> {
  const ids = layerIdsFromIntentFocus(intent, allLayers);
  const next = new Set<LayerId>();
  if (!ids) {
    for (const id of userEnabled) next.add(id);
    for (const l of allLayers) {
      if (!String(l.id).startsWith("ext:")) next.add(l.id);
    }
    return next;
  }
  for (const id of ids) next.add(id);
  for (const id of userEnabled) {
    if (typeof id === "string" && id.startsWith("ext:")) next.add(id);
  }
  return next;
}

function labelSlug(text: string): string {
  const s = text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w_]/g, "")
    .slice(0, 64);
  return s || "place";
}

async function resolvePlaceMatch(
  placeQuery: string | null,
  mapboxToken: string | undefined,
  signal?: AbortSignal,
): Promise<{ center: [number, number]; label: string } | null> {
  if (!placeQuery?.trim()) return null;
  const lower = placeQuery.toLowerCase();
  const hint = matchCaliforniaPlaceHint(lower);
  if (hint) return hint;
  if (mapboxToken?.trim()) {
    const coords = await geocodePlaceInCalifornia(placeQuery, mapboxToken, signal);
    if (coords) return { center: coords, label: labelSlug(placeQuery) };
  }
  return null;
}

function buildParsedFromStructured(
  command: string,
  intent: CopilotStructuredIntent,
  placeMatch: { center: [number, number]; label: string } | null,
  layerNarrow: LayerId[] | null,
): ParsedCopilotCommand {
  const hasFocus = !!(intent.layerFocus && intent.layerFocus.length > 0);
  const f = new Set(intent.layerFocus ?? []);
  return {
    raw: command.trim(),
    acres: intent.acres,
    maxRisk: intent.maxRisk,
    wantsTransmission: !hasFocus || f.has("transmission"),
    wantsWildfire: !hasFocus || f.has("wildfire") || intent.mentionsWind,
    wantsEJ: !hasFocus || f.has("equity"),
    wantsGrid: !hasFocus || f.has("grid"),
    caSubregion: parseCaliforniaSubregion(command.toLowerCase()),
    placeMatch,
    llmWindHint: intent.mentionsWind ? true : undefined,
    structuredLayerFocus: layerNarrow,
  };
}

export async function runStructuredSpatialCopilot(args: {
  command: string;
  intent: CopilotStructuredIntent;
  enabledLayersForRun: Set<LayerId>;
  allLayers: LayerDef[];
  shapeKind: ShapeKind;
  mapboxToken?: string;
  signal?: AbortSignal;
  handlers: CopilotRunHandlers;
}): Promise<string> {
  const placeMatch = await resolvePlaceMatch(args.intent.placeQuery, args.mapboxToken, args.signal);
  const layerNarrow = layerIdsFromIntentFocus(args.intent, args.allLayers);
  const parsed = buildParsedFromStructured(args.command, args.intent, placeMatch, layerNarrow);
  const shapeKind = args.intent.shapeKind ?? args.shapeKind;
  if (args.intent.summary?.trim()) {
    args.handlers.onLog(`llm · ${args.intent.summary.trim().slice(0, 280)}`);
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 120);
    });
  }
  return runSpatialCopilotFromParsed({
    parsed,
    enabledLayers: args.enabledLayersForRun,
    allLayers: args.allLayers,
    shapeKind,
    signal: args.signal,
    handlers: args.handlers,
  });
}
