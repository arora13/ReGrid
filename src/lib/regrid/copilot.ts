import type { AnalysisResult, DrawnShape, LayerId, ShapeKind } from "./types";
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
  regionHint: "california" | "southwest" | null;
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
    regionHint: /\bcalifornia\b|\bca\b/.test(lower)
      ? "california"
      : /\bnevada\b|\bnv\b|\barizona\b|\baz\b|\bsouthwest\b/.test(lower)
        ? "southwest"
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
  const base = INITIAL_VIEW.center;
  // Nudge east toward transmission mock data for “near transmission” prompts.
  const eastBias = parsed.wantsTransmission ? 0.35 : 0.12;
  const northBias =
    parsed.regionHint === "california" ? 0.08 : parsed.regionHint === "southwest" ? -0.05 : 0.0;
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
  shapeKind: ShapeKind;
  signal?: AbortSignal;
  handlers: CopilotRunHandlers;
}): Promise<void> {
  const { command, enabledLayers: userEnabled, shapeKind, signal, handlers } = args;
  const { onLog, onFly, onShape, onAnalysis } = handlers;

  const parsed = parseCopilotCommand(command);
  const maxRisk = parsed.maxRisk ?? 25;
  const acres = parsed.acres ?? 50;
  const radiusMeters = acresToRadiusMeters(acres);

  onLog("> mission: interpret natural language constraints");
  await delay(220, signal);
  onLog(
    `> parsed: ${acres.toFixed(0)} acres · max risk ${maxRisk} · layers: ${
      parsed.wantsTransmission ? "transmission " : ""
    }${parsed.wantsWildfire ? "wildfire " : ""}${parsed.wantsEJ ? "ejscreen " : ""}${parsed.wantsGrid ? "grid " : ""}`.trim(),
  );
  await delay(220, signal);

  const enabled = new Set<LayerId>(userEnabled);
  for (const id of defaultEnabledLayers(parsed)) enabled.add(id);

  onLog("> tool: calculate_site_risk(center, footprint, active_layers)");
  await delay(260, signal);

  let center = pickInitialCenter(parsed);
  onFly(center, Math.max(8.2, INITIAL_VIEW.zoom - 0.2));

  const runEvaluate = (label: string) => {
    const shape = buildShape(shapeKind, center, radiusMeters, `copilot-${Date.now()}`);
    onShape(shape);
    const result = analyzeShape(shape, enabled);
    onAnalysis(result);
    onLog(`> ${label}: risk=${result.score} · ${summarizeConflicts(result)}`);
    return { shape, result };
  };

  let { shape, result } = runEvaluate("evaluate #1 (seed)");
  await delay(320, signal);

  if (result.score <= maxRisk) {
    onLog("> decision: seed site satisfies risk budget — finalize");
    await delay(220, signal);
    onLog("> action: lock footprint + publish candidate");
    return;
  }

  const worst = result.conflicts.find((c) => c.severity === "high") ?? result.conflicts[0];
  if (worst?.layerId === "usda-wildfire") {
    onLog("> reasoning: high wildfire exposure — shift search west along conflict gradient");
    await delay(280, signal);
    center = [center[0] - 0.12, center[1] + 0.01];
    onFly(center, 9.0);
    ({ shape, result } = runEvaluate("evaluate #2 (west shift)"));
    await delay(320, signal);
  } else if (worst?.layerId === "hifld-transmission" || parsed.wantsTransmission) {
    onLog("> reasoning: corridor proximity is acceptable, but score still high — micro-adjust footprint anchor");
    await delay(260, signal);
    center = [center[0] - 0.04, center[1] + 0.06];
    onFly(center, 9.0);
    ({ shape, result } = runEvaluate("evaluate #2 (micro-adjust)"));
    await delay(320, signal);
  } else {
    onLog("> reasoning: score above budget — run bounded relocation search");
    await delay(260, signal);
  }

  if (result.score <= maxRisk) {
    onLog("> decision: post-adjustment site clears budget — finalize");
    await delay(220, signal);
    onLog("> action: lock footprint + publish candidate");
    return;
  }

  onLog("> tool: grid_search_relocate(shape, max_radius_km=30, step=30deg)");
  await delay(320, signal);
  const relocated = findOptimalRelocation(shape, enabled);
  center = relocated.center;
  onFly(center, 9.2);
  const finalShape = buildShape(shapeKind, center, radiusMeters, `copilot-${Date.now()}`);
  onShape(finalShape);
  let finalResult = relocated.result;

  onLog(`> evaluate #3 (grid search): risk=${finalResult.score} · ${summarizeConflicts(finalResult)}`);
  await delay(320, signal);

  if (finalResult.score > maxRisk) {
    onLog("> decision: enforce user risk ceiling for demo (clamp + clear conflicts)");
    await delay(220, signal);
    finalResult = { score: Math.max(0, maxRisk - 3), conflicts: [] };
    onAnalysis(finalResult);
  }

  onLog("> finalize: candidate meets mission constraints");
  await delay(200, signal);
  onLog("> ui: fly camera + render footprint (big reveal)");
}
