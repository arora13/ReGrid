import type { AnalysisResult, DrawnShape, LayerDef, LayerId, ShapeKind } from "./types";
import { INITIAL_VIEW } from "./layers";
import { buildShape, distanceMeters } from "./geo";
import { analyzeShape, findOptimalRelocation } from "./analyze";
import { clampLngLatToCalifornia } from "./california";
import { matchCaliforniaPlaceHint } from "./californiaPlaces";
import { reverseGeocode } from "./mapbox-geocode";

/** In-state seed only; prompts outside CA vocabulary still land in California. */
export type CaliforniaSubregion = "norcal" | "socal" | "central" | null;

export interface ParsedCopilotCommand {
  raw: string;
  acres: number | null;
  maxRisk: number | null;
  wantsTransmission: boolean;
  wantsWildfire: boolean;
  wantsEJ: boolean;
  wantsGrid: boolean;
  caSubregion: CaliforniaSubregion;
  /** Demo anchor from place-name regexes — not full geocoding. */
  placeMatch: { center: [number, number]; label: string } | null;
  /** When intent came from the LLM and `mentionsWind` was true (no literal "wind" required). */
  llmWindHint?: boolean;
  /**
   * When set, scoring uses only these builtin layer ids (plus any `ext:` layers the user already enabled).
   * When unset, the usual `defaultEnabledLayers` merge applies.
   */
  structuredLayerFocus?: LayerId[] | null;
}

export function parseCaliforniaSubregion(lower: string): CaliforniaSubregion {
  if (/\b(socal|los angeles|san diego|orange county)\b/.test(lower)) return "socal";
  if (/\b(central valley|fresno|bakersfield|sacramento)\b/.test(lower)) return "central";
  if (
    /\b(norcal|bay area|silicon valley|san francisco)\b/.test(lower) ||
    /\bsf bay\b/.test(lower)
  ) {
    return "norcal";
  }
  return null;
}

export function parseCopilotCommand(text: string): ParsedCopilotCommand {
  const raw = text.trim();
  const lower = raw.toLowerCase();

  const acresMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:acre|acres)\b/);
  const riskMatch = lower.match(/(?:risk|score)\s*(?:under|below|<|<=)\s*(\d{1,3})\b/);
  const placeMatch = matchCaliforniaPlaceHint(lower);

  return {
    raw,
    acres: acresMatch ? Number(acresMatch[1]) : null,
    maxRisk: riskMatch ? Number(riskMatch[1]) : null,
    wantsTransmission: /\btransmission\b|\bhifld\b|\bpower\s*line\b|\bgrid\s*line\b/i.test(lower),
    wantsWildfire:
      /\bwildfire\b|\bfire\b|\busda\b|\bwind[\s-]*risk\b|\bwind\b.*\b(risk|exposure|hazard)\b/i.test(
        lower,
      ),
    wantsEJ: /\bejscreen\b|\bdisadvantaged\b|\bjustice\b|\bej\b/i.test(lower),
    wantsGrid: /\beia\b|\bsubstation\b|\bswitchyard\b|\bgrid\b/i.test(lower),
    caSubregion: parseCaliforniaSubregion(lower),
    placeMatch,
  };
}

function acresToRadiusMeters(acres: number): number {
  const a = Math.max(1, acres);
  return Math.sqrt((a * 4046.8564224) / Math.PI);
}

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => resolve(), ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        const err = new Error("Aborted");
        err.name = "AbortError";
        reject(err);
      },
      { once: true },
    );
  });
}

function pickFlyZoom(parsed: ParsedCopilotCommand): number {
  if (parsed.placeMatch) return 8.35;
  switch (parsed.caSubregion) {
    case "norcal":
      return 6.45;
    case "socal":
      return 6.55;
    case "central":
      return 6.4;
    default:
      return Math.max(5.65, INITIAL_VIEW.zoom);
  }
}

function pickInitialCenter(parsed: ParsedCopilotCommand): [number, number] {
  if (parsed.placeMatch) {
    const base = parsed.placeMatch.center;
    const eastBias = parsed.wantsTransmission ? 0.025 : 0;
    return clampLngLatToCalifornia([base[0] + eastBias, base[1]]);
  }
  const statewide = INITIAL_VIEW.center;
  const seeds: Record<NonNullable<CaliforniaSubregion>, [number, number]> = {
    norcal: [-122.35, 39.15],
    central: [-119.55, 36.35],
    socal: [-118.15, 34.05],
  };
  const base = parsed.caSubregion ? seeds[parsed.caSubregion] : statewide;
  const eastBias = parsed.wantsTransmission ? 0.12 : 0.04;
  return clampLngLatToCalifornia([base[0] + eastBias, base[1]]);
}

function defaultEnabledLayers(parsed: ParsedCopilotCommand): Set<LayerId> {
  // When user explicitly names a dataset category, focus the search on only those layers.
  // "lowest wildfire risk" → usda-wildfire only. "lowest risk" → full stack.
  const specific: LayerId[] = [];
  if (parsed.wantsWildfire) specific.push("usda-wildfire");
  if (parsed.wantsTransmission) specific.push("hifld-transmission");
  if (parsed.wantsEJ) specific.push("epa-ejscreen");
  if (parsed.wantsGrid) specific.push("eia-grid");

  if (specific.length > 0) {
    return new Set<LayerId>(specific);
  }
  return new Set<LayerId>(["hifld-transmission", "usda-wildfire", "epa-ejscreen"]);
}

function summarizeConflicts(result: AnalysisResult): string {
  if (result.conflicts.length === 0) return "No major conflicts flagged on active layers.";
  return result.conflicts
    .slice(0, 3)
    .map((c) => c.label)
    .join(" · ");
}


export function windMentioned(parsed: ParsedCopilotCommand): boolean {
  if (/\bsolar\b/i.test(parsed.raw)) return false;
  if (parsed.llmWindHint) return true;
  return /\bwind\b/i.test(parsed.raw);
}

/** 8-wind compass from `from` → `to` (degrees of rotation). */
function compass8(from: [number, number], to: [number, number]): string {
  const lat1 = (from[1] * Math.PI) / 180;
  const dLng = ((to[0] - from[0]) * Math.PI) / 180;
  const dLat = ((to[1] - from[1]) * Math.PI) / 180;
  const x = dLng * Math.cos(lat1);
  const deg = (Math.atan2(x, dLat) * 180) / Math.PI;
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const i = ((Math.round(deg / 45) % 8) + 8) % 8;
  return dirs[i];
}

export type WindPlaceSpatialVariant = "improved_away" | "micro_shift" | "tie_no_better";

export interface WindPlaceNearestMockMeta {
  /** Title-case place name for sentences. */
  placeTitle: string;
  anchorScore: number;
  bestScore: number;
  km: number;
  compass: string;
  spatialVariant: WindPlaceSpatialVariant;
}

/**
 * From the named city center, find lowest mock spatial score within ~150 km.
 * Updates map/analysis to that point. Not wind engineering.
 */
export function applyWindPlaceNearestMockDemo(args: {
  parsed: ParsedCopilotCommand;
  shapeKind: ShapeKind;
  radiusMeters: number;
  enabled: Set<LayerId>;
  allLayers: LayerDef[];
  onShape: CopilotRunHandlers["onShape"];
  onAnalysis: CopilotRunHandlers["onAnalysis"];
  onFly: CopilotRunHandlers["onFly"];
  onLog: CopilotRunHandlers["onLog"];
}): { meta: WindPlaceNearestMockMeta; result: AnalysisResult } {
  const { parsed, shapeKind, radiusMeters, enabled, allLayers, onShape, onAnalysis, onFly, onLog } =
    args;
  const pm = parsed.placeMatch!;
  const anchorCenter = clampLngLatToCalifornia(pm.center);
  const placeTitle = pm.label.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
  const anchorShape = buildShape(
    shapeKind,
    anchorCenter,
    radiusMeters,
    `wind-anchor-${Date.now()}`,
  );
  const anchorRes = analyzeShape(anchorShape, enabled, allLayers);
  const wide = findOptimalRelocation(anchorShape, enabled, allLayers, { maxOffsetDeg: 1.35 });
  const km = distanceMeters(anchorCenter, wide.center) / 1000;
  const compass = compass8(anchorCenter, wide.center);
  const improved = wide.result.score < anchorRes.score - 0.001;
  const spatialVariant: WindPlaceSpatialVariant =
    improved && km >= 2.5
      ? "improved_away"
      : improved && km < 2.5
        ? "micro_shift"
        : "tie_no_better";

  const placed = buildShape(shapeKind, wide.center, radiusMeters, `wind-place-${Date.now()}`);
  onShape(placed);
  onAnalysis(wide.result);
  onFly(wide.center, 8.65);
  onLog(
    `result · wind_place_nearest_mock_ring · variant=${spatialVariant} · anchor_score=${anchorRes.score} · best_in_ring=${wide.result.score} · d_km=${km.toFixed(1)} · dir=${compass}`,
  );

  return {
    meta: {
      placeTitle,
      anchorScore: anchorRes.score,
      bestScore: wide.result.score,
      km,
      compass,
      spatialVariant,
    },
    result: wide.result,
  };
}

export function buildWindPlaceUserAnswer(
  _parsed: ParsedCopilotCommand,
  result: AnalysisResult,
  acres: number,
  meta: WindPlaceNearestMockMeta,
): string {
  const ac = Math.round(acres);
  const p = meta.placeTitle;
  const tail =
    result.conflicts.length === 0
      ? `The marker scores ${result.score}/100 on the checked demo layers (no overlaps flagged).`
      : `The marker scores ${result.score}/100; strongest drivers: ${result.conflicts
          .slice(0, 2)
          .map((c) => c.label)
          .join("; ")}.`;

  const head = `There is no lowest wind-risk site answer near ${p}: wind turbines, wakes, and wind resource are not modeled, so "wind risk" cannot be ranked. `;

  let mid: string;
  switch (meta.spatialVariant) {
    case "improved_away":
      mid = `What we can do instead (mock transmission, wildfire, equity only): the lowest siting score we found within ~150 km of ${p} is about ${meta.km.toFixed(0)} km ${meta.compass} of the city center (${meta.bestScore}/100 vs ${meta.anchorScore}/100 at the anchor). The map is centered there. That is not a wind-safety conclusion. `;
      break;
    case "micro_shift":
      mid = `On those same demo layers, a small shift changes the mock score from ${meta.anchorScore}/100 to ${meta.bestScore}/100. That is toy-geometry sensitivity, not a discoverable "nearest wind site." `;
      break;
    default:
      mid = `On those demo layers we did not find any footprint that scores lower than the city anchor within ~150 km (search best matches the anchor at about ${meta.anchorScore}/100). So there is no separate "nearest better" spot to name — only this mock score. `;
      break;
  }

  return `${head}${mid}${tail} About ${ac} ac; demo only.`.replace(/\s+/g, " ").trim();
}

/** Plain-language summary for the UI — not legal or engineering advice. */
export function buildCopilotUserAnswer(
  parsed: ParsedCopilotCommand,
  result: AnalysisResult,
  acres: number,
  reloc?: { km: number; compass: string; anchorScore: number } | null,
  specificPlace?: string | null,
  finalCenter?: [number, number] | null,
): string {
  const ac = Math.round(acres);

  // Human-readable place name
  const placeTitle = parsed.placeMatch
    ? parsed.placeMatch.label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : parsed.caSubregion === "central"
      ? "Central Valley"
      : parsed.caSubregion === "socal"
        ? "Southern California"
        : parsed.caSubregion === "norcal"
          ? "Northern California"
          : "California";

  // Coordinates string for pinpoint reference
  const coordStr = finalCenter
    ? `${Math.abs(finalCenter[1]).toFixed(4)}°${finalCenter[1] >= 0 ? "N" : "S"}, ${Math.abs(finalCenter[0]).toFixed(4)}°${finalCenter[0] >= 0 ? "E" : "W"}`
    : null;

  // Location string — prefer real reverse-geocoded name over generic city+direction
  const dirStr =
    reloc && reloc.km >= 1.5
      ? `${reloc.km.toFixed(1)} km ${reloc.compass} of ${placeTitle}`
      : `near ${placeTitle}`;

  const locationStr = specificPlace
    ? `${specificPlace}${coordStr ? ` (${coordStr})` : ""} — ${dirStr}`
    : coordStr
      ? `${dirStr} (${coordStr})`
      : dirStr;

  // Score tier label
  const tier =
    result.score <= 20
      ? "very low"
      : result.score <= 35
        ? "low"
        : result.score <= 55
          ? "moderate"
          : result.score <= 75
            ? "high"
            : "very high";

  // Improvement note when relocation reduced the score
  const improvement =
    reloc && reloc.anchorScore - result.score >= 4
      ? ` — improved from ${reloc.anchorScore} at the city-center anchor`
      : "";

  // Conflict summary
  const topConflicts = result.conflicts.slice(0, 3);
  const conflictStr =
    topConflicts.length === 0
      ? "no spatial conflicts detected on the active layers"
      : topConflicts
          .map((c) => {
            const label = c.label
              .toLowerCase()
              .replace(/\s+overlap$/i, "")
              .replace(/\s+nearby.*$/i, "");
            const detail = c.detail.split("—")[0]?.trim() ?? c.detail.slice(0, 45);
            return `${label} (${detail})`;
          })
          .join("; ");

  // Which datasets were actually checked
  const checkedLayers: string[] = [];
  if (parsed.wantsWildfire) checkedLayers.push("wildfire risk zones");
  if (parsed.wantsTransmission) checkedLayers.push("transmission corridors");
  if (parsed.wantsEJ) checkedLayers.push("equity tracts");
  if (parsed.wantsGrid) checkedLayers.push("grid infrastructure");
  if (checkedLayers.length === 0)
    checkedLayers.push("wildfire risk zones", "transmission corridors", "equity tracts");
  const layerStr = checkedLayers.join(", ");

  // Wind-specific note (only when wind power resource was implied)
  const windNote = windMentioned(parsed)
    ? " Note: wind turbine resource and wake modelling is not included — this score covers spatial conflicts only."
    : "";

  return (
    `Best candidate ${locationStr}, ${ac} ac — risk score ${result.score}/100 (${tier})${improvement}. ` +
    `Checked ${layerStr}: ${conflictStr}.${windNote} ` +
    `Run full analysis to add real-time fault-zone and critical-habitat screening from federal ArcGIS services.`
  )
    .replace(/\s+/g, " ")
    .trim();
}

export interface CopilotRunHandlers {
  onLog: (line: string) => void;
  onFly: (center: [number, number], zoom?: number) => void;
  onShape: (shape: DrawnShape | null) => void;
  onAnalysis: (result: AnalysisResult | null) => void;
}

export async function runSpatialCopilotFromParsed(args: {
  parsed: ParsedCopilotCommand;
  enabledLayers: Set<LayerId>;
  allLayers: LayerDef[];
  shapeKind: ShapeKind;
  mapboxToken?: string;
  signal?: AbortSignal;
  handlers: CopilotRunHandlers;
}): Promise<string> {
  const { parsed, enabledLayers: userEnabled, allLayers, shapeKind, signal, handlers } = args;
  const mapboxToken = args.mapboxToken;
  const { onLog, onFly, onShape, onAnalysis } = handlers;

  const maxRisk = parsed.maxRisk ?? 25;
  const acres = parsed.acres ?? 50;
  const radiusMeters = acresToRadiusMeters(acres);

  onLog("receipt · mission_received");
  await delay(220, signal);
  onLog(
    `receipt · constraints_parsed · acres=${acres.toFixed(0)} · max_risk=${maxRisk} · region=california${
      parsed.placeMatch
        ? ` · place=${parsed.placeMatch.label}`
        : parsed.caSubregion
          ? ` · sub=${parsed.caSubregion}`
          : ""
    } · focus=${
      parsed.wantsTransmission ? "transmission " : ""
    }${parsed.wantsWildfire ? "wildfire " : ""}${parsed.wantsEJ ? "equity " : ""}${parsed.wantsGrid ? "grid " : ""}`.trim(),
  );
  if (windMentioned(parsed)) {
    onLog(
      "notice · wind_generation_not_modeled · spatial_score_is_mock_transmission_wildfire_equity_only",
    );
  }
  await delay(220, signal);

  const enabled = new Set<LayerId>(userEnabled);
  const narrow = parsed.structuredLayerFocus?.filter(Boolean) ?? [];
  if (narrow.length > 0) {
    const allowed = new Set<LayerId>(narrow);
    for (const id of userEnabled) {
      if (typeof id === "string" && id.startsWith("ext:")) allowed.add(id);
    }
    for (const id of allowed) enabled.add(id);
  } else {
    for (const id of defaultEnabledLayers(parsed)) enabled.add(id);
  }

  // Captures distance + direction from the city anchor to wherever the AI finally lands.
  type RelocInfo = { km: number; compass: string; anchorScore: number };
  const makeReloc = (finalCenter: [number, number], anchorScore: number): RelocInfo | null => {
    if (!parsed.placeMatch) return null;
    const km = distanceMeters(parsed.placeMatch.center, finalCenter) / 1000;
    return { km, compass: compass8(parsed.placeMatch.center, finalCenter), anchorScore };
  };

  const finishRun = async (finalResult: AnalysisResult, referenceFinalCenter: [number, number], anchorScore: number): Promise<string> => {
    if (windMentioned(parsed) && parsed.placeMatch) {
      const { meta, result: r } = applyWindPlaceNearestMockDemo({
        parsed,
        shapeKind,
        radiusMeters,
        enabled,
        allLayers,
        onShape,
        onAnalysis,
        onFly,
        onLog,
      });
      return buildWindPlaceUserAnswer(parsed, r, acres, meta);
    }
    // Reverse geocode the final center to give a specific named location
    const specificPlace = mapboxToken
      ? await reverseGeocode(referenceFinalCenter, mapboxToken, signal).catch(() => null)
      : null;
    return buildCopilotUserAnswer(parsed, finalResult, acres, makeReloc(referenceFinalCenter, anchorScore), specificPlace, referenceFinalCenter);
  };

  onLog("tool · calculate_site_risk { footprint, active_layers }");
  await delay(260, signal);

  let center = pickInitialCenter(parsed);
  onFly(center, pickFlyZoom(parsed));

  const runEvaluate = (label: string) => {
    const shape = buildShape(shapeKind, center, radiusMeters, `copilot-${Date.now()}`);
    onShape(shape);
    const result = analyzeShape(shape, enabled, allLayers);
    onAnalysis(result);
    onLog(`result · ${label} · risk=${result.score} · ${summarizeConflicts(result)}`);
    return { shape, result };
  };

  let { shape, result } = runEvaluate("evaluate #1 (seed)");
  const seedScore = result.score; // anchor score for relocation delta
  await delay(320, signal);

  if (result.score <= maxRisk) {
    onLog("decision · seed_within_budget");
    await delay(220, signal);
    onLog("action · publish_candidate");
    return await finishRun(result, center, seedScore);
  }

  const worst = result.conflicts.find((c) => c.severity === "high") ?? result.conflicts[0];
  if (worst?.layerId === "usda-wildfire") {
    const shift = parsed.placeMatch ? 0.022 : 0.12;
    onLog(
      parsed.placeMatch
        ? "analysis · high_wildfire_exposure → micro_shift (place_anchor)"
        : "analysis · high_wildfire_exposure → shift_west",
    );
    await delay(280, signal);
    center = clampLngLatToCalifornia([center[0] - shift, center[1] + 0.008]);
    onFly(center, Math.min(8.6, pickFlyZoom(parsed) + 2.0));
    ({ shape, result } = runEvaluate("evaluate #2 (west shift)"));
    await delay(320, signal);
  } else if (worst?.layerId === "hifld-transmission" || parsed.wantsTransmission) {
    onLog("analysis · transmission_proximity_ok → micro_adjust_anchor");
    await delay(260, signal);
    center = clampLngLatToCalifornia([center[0] - 0.04, center[1] + 0.06]);
    onFly(center, Math.min(8.6, pickFlyZoom(parsed) + 2.0));
    ({ shape, result } = runEvaluate("evaluate #2 (micro-adjust)"));
    await delay(320, signal);
  } else {
    onLog("analysis · score_above_budget → bounded_search");
    await delay(260, signal);
  }

  if (result.score <= maxRisk) {
    onLog("decision · post_adjustment_within_budget");
    await delay(220, signal);
    onLog("action · publish_candidate");
    return await finishRun(result, center, seedScore);
  }

  // Tight disk for named cities (~15–20 km); wider for generic CA prompts.
  const relocRadiusDeg = parsed.placeMatch ? 0.16 : 1.05;
  onLog(
    `tool · grid_search_relocate { step_deg: 30, max_offset_deg: ${relocRadiusDeg.toFixed(2)} from_seed }`,
  );
  await delay(320, signal);
  const relocated = findOptimalRelocation(shape, enabled, allLayers, {
    maxOffsetDeg: relocRadiusDeg,
  });
  center = clampLngLatToCalifornia(relocated.center);
  onFly(center, 9.2);
  const finalShape = buildShape(shapeKind, center, radiusMeters, `copilot-${Date.now()}`);
  onShape(finalShape);
  const finalResult = relocated.result;

  onLog(
    `result · grid_search_best · risk=${finalResult.score} · ${summarizeConflicts(finalResult)}`,
  );
  await delay(320, signal);

  if (finalResult.score > maxRisk) {
    onLog("decision · best_candidate_exceeds_risk_ceiling");
    await delay(220, signal);
  } else {
    onLog("decision · candidate_meets_risk_criteria");
    await delay(220, signal);
  }

  onLog("decision · candidate_selected");
  await delay(200, signal);
  onLog("ui · fly_to_candidate + render_footprint");
  return await finishRun(finalResult, center, seedScore);
}

export async function runSpatialCopilotDemo(args: {
  command: string;
  enabledLayers: Set<LayerId>;
  allLayers: LayerDef[];
  shapeKind: ShapeKind;
  mapboxToken?: string;
  signal?: AbortSignal;
  handlers: CopilotRunHandlers;
}): Promise<string> {
  const parsed = parseCopilotCommand(args.command);
  return runSpatialCopilotFromParsed({ ...args, parsed });
}
