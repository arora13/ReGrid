import type { AnalysisResult, DrawnShape, LayerDef, LayerId, ShapeKind } from "./types";
import { INITIAL_VIEW } from "./layers";
import { buildShape } from "./geo";
import { analyzeShape, findOptimalRelocation } from "./analyze";

export interface ParsedCopilotCommand {
  raw: string;
  acres: number | null;
  maxRisk: number | null;
  wantsTransmission: boolean;
  wantsWildfire: boolean;
  wantsEJ: boolean;
  wantsGrid: boolean;
  regionHint: "california" | "southwest" | "texas" | "midwest" | "southeast" | "northeast" | null;
}

export function parseCopilotCommand(text: string): ParsedCopilotCommand {
  const raw = text.trim();
  const lower = raw.toLowerCase();

  const acresMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:acre|acres)\b/);
  const riskMatch = lower.match(/(?:risk|score)\s*(?:under|below|<|<=)\s*(\d{1,3})\b/);

  return {
    raw,
    acres: acresMatch ? Number(acresMatch[1]) : null,
    maxRisk: riskMatch ? Number(riskMatch[1]) : null,
    wantsTransmission: /\btransmission\b|\bhifld\b|\bpower\s*line\b|\bgrid\s*line\b/i.test(lower),
    wantsWildfire: /\bwildfire\b|\bfire\b|\busda\b/i.test(lower),
    wantsEJ: /\bejscreen\b|\bdisadvantaged\b|\bjustice\b|\bej\b/i.test(lower),
    wantsGrid: /\beia\b|\bsubstation\b|\bswitchyard\b|\bgrid\b/i.test(lower),
    regionHint: /\bcalifornia\b|\bca\b|\bnorcal\b|\bsocal\b|\bcentral valley\b/.test(lower)
      ? "california"
      : /\barizona\b|\baz\b|\bnevada\b|\bnv\b|\bnew\s?mexico\b|\bnm\b|\bsouthwest\b/.test(
      lower,
    )
      ? "southwest"
      : /\btexas\b|\btx\b/.test(lower)
        ? "texas"
        : /\bmidwest\b|\billinois\b|\bil\b|\biowa\b|\bio\b|\bminnesota\b|\bmn\b|\bkansas\b|\bks\b/.test(
              lower,
            )
          ? "midwest"
          : /\bgeorgia\b|\bga\b|\bflorida\b|\bfl\b|\bcarolina\b|\bsoutheast\b/.test(lower)
            ? "southeast"
            : /\bnew\s?york\b|\bny\b|\bpennsylvania\b|\bpa\b|\bnortheast\b/.test(lower)
              ? "northeast"
              : null,
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

function pickInitialCenter(parsed: ParsedCopilotCommand): [number, number] {
  // Demo uses regional synthetic data; map user hints to broad U.S. regions.
  const regionalBase: Record<NonNullable<ParsedCopilotCommand["regionHint"]>, [number, number]> = {
    california: [-119.4179, 36.7783],
    southwest: [-111.6, 34.8],
    texas: [-100.0, 31.3],
    midwest: [-93.7, 41.6],
    southeast: [-84.6, 33.5],
    northeast: [-74.7, 41.2],
  };
  const base = parsed.regionHint ? regionalBase[parsed.regionHint] : INITIAL_VIEW.center;
  // Nudge toward likely corridor overlays for transmission-focused prompts.
  const eastBias = parsed.wantsTransmission ? 0.16 : 0.05;
  const northBias =
    parsed.regionHint === "southeast" ? -0.04 : parsed.regionHint === "northeast" ? 0.04 : 0.0;
  return [base[0] + eastBias, base[1] + northBias];
}

function defaultEnabledLayers(parsed: ParsedCopilotCommand): Set<LayerId> {
  // If user mentions specific layers, bias toggles; otherwise keep a strong demo stack.
  const s = new Set<LayerId>(["hifld-transmission", "usda-wildfire", "epa-ejscreen"]);
  if (parsed.wantsGrid) s.add("eia-grid");
  if (parsed.wantsTransmission) s.add("hifld-transmission");
  if (parsed.wantsWildfire) s.add("usda-wildfire");
  if (parsed.wantsEJ) s.add("epa-ejscreen");
  return s;
}

function summarizeConflicts(result: AnalysisResult): string {
  if (result.conflicts.length === 0) return "No major conflicts flagged on active layers.";
  return result.conflicts
    .slice(0, 3)
    .map((c) => c.label)
    .join(" · ");
}

export interface CopilotRunHandlers {
  onLog: (line: string) => void;
  onFly: (center: [number, number], zoom?: number) => void;
  onShape: (shape: DrawnShape | null) => void;
  onAnalysis: (result: AnalysisResult | null) => void;
}

export async function runSpatialCopilotDemo(args: {
  command: string;
  enabledLayers: Set<LayerId>;
  allLayers: LayerDef[];
  shapeKind: ShapeKind;
  signal?: AbortSignal;
  handlers: CopilotRunHandlers;
}): Promise<void> {
  const { command, enabledLayers: userEnabled, allLayers, shapeKind, signal, handlers } = args;
  const { onLog, onFly, onShape, onAnalysis } = handlers;

  const parsed = parseCopilotCommand(command);
  const maxRisk = parsed.maxRisk ?? 25;
  const acres = parsed.acres ?? 50;
  const radiusMeters = acresToRadiusMeters(acres);

  onLog("receipt · mission_received");
  await delay(220, signal);
  onLog(
    `receipt · constraints_parsed · acres=${acres.toFixed(0)} · max_risk=${maxRisk} · focus=${
      parsed.wantsTransmission ? "transmission " : ""
    }${parsed.wantsWildfire ? "wildfire " : ""}${parsed.wantsEJ ? "equity " : ""}${parsed.wantsGrid ? "grid " : ""}`.trim(),
  );
  await delay(220, signal);

  const enabled = new Set<LayerId>(userEnabled);
  for (const id of defaultEnabledLayers(parsed)) enabled.add(id);

  onLog("tool · calculate_site_risk { footprint, active_layers }");
  await delay(260, signal);

  let center = pickInitialCenter(parsed);
  onFly(center, Math.max(8.2, INITIAL_VIEW.zoom - 0.2));

  const runEvaluate = (label: string) => {
    const shape = buildShape(shapeKind, center, radiusMeters, `copilot-${Date.now()}`);
    onShape(shape);
    const result = analyzeShape(shape, enabled, allLayers);
    onAnalysis(result);
    onLog(`result · ${label} · risk=${result.score} · ${summarizeConflicts(result)}`);
    return { shape, result };
  };

  let { shape, result } = runEvaluate("evaluate #1 (seed)");
  await delay(320, signal);

  if (result.score <= maxRisk) {
    onLog("decision · seed_within_budget");
    await delay(220, signal);
    onLog("action · publish_candidate");
    return;
  }

  const worst = result.conflicts.find((c) => c.severity === "high") ?? result.conflicts[0];
  if (worst?.layerId === "usda-wildfire") {
    onLog("analysis · high_wildfire_exposure → shift_west");
    await delay(280, signal);
    center = [center[0] - 0.12, center[1] + 0.01];
    onFly(center, 9.0);
    ({ shape, result } = runEvaluate("evaluate #2 (west shift)"));
    await delay(320, signal);
  } else if (worst?.layerId === "hifld-transmission" || parsed.wantsTransmission) {
    onLog("analysis · transmission_proximity_ok → micro_adjust_anchor");
    await delay(260, signal);
    center = [center[0] - 0.04, center[1] + 0.06];
    onFly(center, 9.0);
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
    return;
  }

  onLog("tool · grid_search_relocate { radius_km: 30, step_deg: 30 }");
  await delay(320, signal);
  const relocated = findOptimalRelocation(shape, enabled, allLayers);
  center = relocated.center;
  onFly(center, 9.2);
  const finalShape = buildShape(shapeKind, center, radiusMeters, `copilot-${Date.now()}`);
  onShape(finalShape);
  let finalResult = relocated.result;

  onLog(`result · grid_search_best · risk=${finalResult.score} · ${summarizeConflicts(finalResult)}`);
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
}
