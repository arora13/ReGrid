import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapCanvas } from "@/components/regrid/MapCanvas";
import { TokenGate } from "@/components/regrid/TokenGate";
import { SpatialCopilot } from "@/components/regrid/SpatialCopilot";
import { LeftOperationsRail } from "@/components/regrid/LeftOperationsRail";
import { RiskScoreHUD } from "@/components/regrid/RiskScoreHUD";
import { WorkspaceHeader, workspaceProjectLabel } from "@/components/regrid/WorkspaceHeader";
import { LAYERS } from "@/lib/regrid/layers";
import { loadManifestLayers } from "@/lib/regrid/datasets";
import { clampLngLatToCalifornia, LOCAL_RELOCATE_MAX_OFFSET_DEG } from "@/lib/regrid/california";
import { buildShape, distanceMeters } from "@/lib/regrid/geo";
import { analyzeShape, findOptimalRelocation } from "@/lib/regrid/analyze";
import { getPublicMapboxTokenFromEnv } from "@/lib/regrid/env";
import type {
  AnalysisResult,
  Conflict,
  DrawnShape,
  LayerDef,
  LayerId,
  ProjectKind,
  ShapeKind,
} from "@/lib/regrid/types";

export const Route = createFileRoute("/")({
  // Mapbox/WebGL must not run during SSR — avoids blank maps after hydration.
  ssr: false,
  head: () => ({
    meta: [
      { title: "ReGrid · Spatial Intelligence for Clean Energy Siting" },
      {
        name: "description",
        content:
          "Enterprise spatial intelligence dashboard for siting clean energy infrastructure while avoiding spatial conflicts with federal datasets.",
      },
      { property: "og:title", content: "ReGrid · Spatial Intelligence Platform" },
      {
        property: "og:description",
        content:
          "Site solar, wind, and battery infrastructure with real-time conflict analysis against federal grid, wildfire, and EJScreen layers.",
      },
    ],
  }),
  component: RegridApp,
});

const TOKEN_KEY = "regrid:mapbox-token";
type AnalysisState = "idle" | "analyzing" | "result" | "relocating";

function acresToRadiusMeters(acres: number) {
  const a = Math.max(1, acres);
  return Math.sqrt((a * 4046.8564224) / Math.PI);
}

function summarizeAvoided(before: Conflict[] | null, after: Conflict[] | null): string | null {
  if (!before?.length) return null;
  const afterLabels = new Set((after ?? []).map((c) => c.label));
  const removed = before.find((c) => !afterLabels.has(c.label));
  if (!removed) return null;
  if (removed.layerId === "usda-wildfire") return "Wildfire exposure reduced materially.";
  if (removed.layerId === "epa-ejscreen") return "Equity-priority overlap avoided.";
  if (removed.layerId === "hifld-transmission" || removed.layerId === "eia-grid") {
    return "Major grid conflict removed (check corridor proximity).";
  }
  if (typeof removed.layerId === "string" && removed.layerId.startsWith("ext:")) {
    return "Imported dataset conflict reduced — review map highlights.";
  }
  return "Top conflict driver changed — review map highlights.";
}

function RegridApp() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const fromEnv = getPublicMapboxTokenFromEnv();
    if (fromEnv) {
      setToken(fromEnv);
      return;
    }
    const saved = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (saved) setToken(saved);
  }, []);

  const [enabledLayers, setEnabledLayers] = useState<Set<LayerId>>(
    () => new Set<LayerId>(LAYERS.map((l) => l.id)),
  );
  const [projectKind, setProjectKind] = useState<ProjectKind>("solar");
  const [acreage, setAcreage] = useState(50);
  const [activeTool, setActiveTool] = useState<ShapeKind | null>("circle");
  const [shape, setShape] = useState<DrawnShape | null>(null);
  const [ghostShape, setGhostShape] = useState<DrawnShape | null>(null);
  const [shapePulse, setShapePulse] = useState(false);
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [highlightedConflict, setHighlightedConflict] = useState<LayerId | null>(null);
  const [copilotRunning, setCopilotRunning] = useState(false);
  const [copilotAnswer, setCopilotAnswer] = useState<string | null>(null);
  const [relocateSuccess, setRelocateSuccess] = useState(false);
  const [compare, setCompare] = useState<{
    beforeScore: number | null;
    afterScore: number | null;
    movedKm: number | null;
    headline: string | null;
  }>({ beforeScore: null, afterScore: null, movedKm: null, headline: null });
  const prevScoreRef = useRef<number | null>(null);
  const relocateArmedRef = useRef(false);
  const ghostTimerRef = useRef<number | null>(null);
  const pulseTimerRef = useRef<number | null>(null);

  const flyToRef = useRef<(c: [number, number], z?: number) => void>(() => {});

  const radiusMeters = useMemo(() => acresToRadiusMeters(acreage), [acreage]);
  const siteAreaKm2Label = useMemo(() => {
    const km2 = (acreage * 4046.8564224) / 1e6;
    return km2 < 10 ? km2.toFixed(2) : km2.toFixed(1);
  }, [acreage]);

  const copilotStatusLine = useMemo(() => {
    if (copilotRunning) return "Copilot is evaluating your request…";
    if (analysisState === "analyzing") return "Evaluating protected land overlap";
    if (analysisState === "relocating") return "Searching for a lower-risk footprint nearby…";
    if (result && analysisState === "result")
      return `Siting score ${result.score} / 100 — hover drivers on the right to highlight layers`;
    if (shape) return "Ready to run analysis or describe a new goal below";
    return "Describe a siting goal — e.g. lowest-risk solar site in Central Valley, CA";
  }, [copilotRunning, analysisState, result, shape]);

  const handleMapClick = (lngLat: [number, number]) => {
    if (copilotRunning) return;
    if (!activeTool) return;
    setCopilotAnswer(null);
    const id = `shape-${Date.now()}`;
    const next = buildShape(activeTool, clampLngLatToCalifornia(lngLat), radiusMeters, id);
    setShape(next);
    setGhostShape(null);
    setShapePulse(true);
    if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = window.setTimeout(() => setShapePulse(false), 2400);
    setResult(null);
    setAnalysisState("idle");
    setCompare({ beforeScore: null, afterScore: null, movedKm: null, headline: null });
    flyToRef.current(clampLngLatToCalifornia(lngLat), Math.max(8.4, 8.4));
  };

  const handleToggleLayer = (id: LayerId) => {
    setEnabledLayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // If a result exists, mark it stale by clearing
    if (result) setResult(null);
    if (analysisState === "result") setAnalysisState("idle");
  };

  const handleAnalyze = () => {
    if (!shape) return;
    setCopilotAnswer(null);
    setAnalysisState("analyzing");
    setResult(null);
    setTimeout(() => {
      const r = analyzeShape(shape, enabledLayers, layersRef.current);
      setResult(r);
      setAnalysisState("result");
    }, 2000);
  };

  const handleRelocate = () => {
    if (!shape) return;
    setCopilotAnswer(null);
    setAnalysisState("relocating");
    setHighlightedConflict(null);
    relocateArmedRef.current = true;
    prevScoreRef.current = result?.score ?? null;
    setRelocateSuccess(false);
    setGhostShape(shape);
    setTimeout(() => {
      const beforeCenter = shape.center;
      const beforeConflicts = result?.conflicts ?? null;
      const { center, result: newResult } = findOptimalRelocation(
        shape,
        enabledLayers,
        layersRef.current,
        {
          maxOffsetDeg: LOCAL_RELOCATE_MAX_OFFSET_DEG,
        },
      );
      flyToRef.current(center, 9.2);
      setTimeout(() => {
        const newShape = buildShape(shape.kind, center, shape.radiusMeters, `shape-${Date.now()}`);
        setShape(newShape);
        setResult(newResult);
        setAnalysisState("result");
        setShapePulse(true);
        if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
        pulseTimerRef.current = window.setTimeout(() => setShapePulse(false), 2600);

        const movedKm = distanceMeters(beforeCenter, center) / 1000;
        const headline = summarizeAvoided(beforeConflicts, newResult.conflicts);
        setCompare({
          beforeScore: prevScoreRef.current,
          afterScore: newResult.score,
          movedKm,
          headline,
        });

        if (ghostTimerRef.current) window.clearTimeout(ghostTimerRef.current);
        ghostTimerRef.current = window.setTimeout(() => setGhostShape(null), 6500);
      }, 900);
    }, 1600);
  };

  const handleClear = () => {
    setCopilotAnswer(null);
    setShape(null);
    setGhostShape(null);
    setShapePulse(false);
    setResult(null);
    setAnalysisState("idle");
    setHighlightedConflict(null);
    setRelocateSuccess(false);
    relocateArmedRef.current = false;
    prevScoreRef.current = null;
    setCompare({ beforeScore: null, afterScore: null, movedKm: null, headline: null });
    if (ghostTimerRef.current) window.clearTimeout(ghostTimerRef.current);
    if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    ghostTimerRef.current = null;
    pulseTimerRef.current = null;
  };

  const [layers, setLayers] = useState<LayerDef[]>(() => [...LAYERS]);
  const layersRef = useRef(layers);
  layersRef.current = layers;

  useEffect(() => {
    void loadManifestLayers().then((extra) => {
      if (!extra.length) return;
      setLayers((prev) => {
        const seen = new Set(prev.map((l) => l.id));
        const merged = [...prev];
        for (const e of extra) {
          if (!seen.has(e.id)) {
            merged.push(e);
            seen.add(e.id);
          }
        }
        return merged;
      });
      setEnabledLayers((prev) => {
        const next = new Set(prev);
        for (const l of extra) next.add(l.id);
        return next;
      });
    });
  }, []);

  useEffect(() => {
    if (!relocateArmedRef.current) return;
    if (analysisState !== "result" || !result) return;
    const before = prevScoreRef.current;
    const after = result.score;
    if (before !== null && after < before) {
      setRelocateSuccess(true);
      const t = window.setTimeout(() => setRelocateSuccess(false), 5200);
      relocateArmedRef.current = false;
      return () => window.clearTimeout(t);
    }
    relocateArmedRef.current = false;
    return;
  }, [analysisState, result]);

  if (!token) {
    return (
      <TokenGate
        onSubmit={(t) => {
          localStorage.setItem(TOKEN_KEY, t);
          setToken(t);
        }}
      />
    );
  }

  return (
    <div className="regrid-workspace fixed inset-0 z-0 flex flex-col overflow-hidden bg-[#0a0e14] ring-1 ring-inset ring-white/[0.06]">
      <WorkspaceHeader projectKind={projectKind} />
      <div className="relative min-h-0 min-w-0 flex-1">
        <div className="absolute inset-0 z-0 min-h-0 min-w-0">
          <MapCanvas
            token={token}
            layers={layers}
            enabledLayers={enabledLayers}
            shape={shape}
            ghostShape={ghostShape}
            shapePulse={shapePulse}
            highlightedConflict={highlightedConflict}
            crosshair={!!activeTool && !copilotRunning}
            onMapClick={handleMapClick}
            onMapReady={(fly) => {
              flyToRef.current = fly;
            }}
          />
        </div>

        {shape ? (
          <div className="pointer-events-none absolute left-1/2 top-[36%] z-[15] w-[min(92vw,320px)] -translate-x-1/2 -translate-y-full">
            <div className="rounded-md border border-[#60a5fa]/30 bg-[#0d1117]/95 px-3 py-2 text-left shadow-xl backdrop-blur-xl">
              <p className="text-[11px] font-semibold tracking-wide text-[#f1f5f9]">
                SITE · {workspaceProjectLabel(projectKind)}
              </p>
              <p className="mt-0.5 text-[10px] leading-snug text-[#94a3b8]">
                {siteAreaKm2Label} km² · {shape.kind} · {(shape.radiusMeters / 1000).toFixed(1)} km
              </p>
            </div>
          </div>
        ) : null}

        <LeftOperationsRail
          layers={layers}
          enabledLayers={enabledLayers}
          onToggleLayer={handleToggleLayer}
          projectKind={projectKind}
          onProjectKindChange={setProjectKind}
          acreage={acreage}
          onAcreageChange={setAcreage}
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          hasShape={!!shape}
          onAnalyze={handleAnalyze}
          onFindBetterSite={handleRelocate}
          onClear={handleClear}
          analysisState={analysisState}
          copilotRunning={copilotRunning}
        />

        <RiskScoreHUD
          hasShape={!!shape}
          analysisState={analysisState}
          result={result}
          copilotAnswer={copilotAnswer}
          onHoverConflict={setHighlightedConflict}
          relocateSuccess={relocateSuccess}
          compare={compare}
          onApplySuggestion={handleRelocate}
          canApplySuggestion={
            !!shape &&
            analysisState === "result" &&
            !!result &&
            result.score >= 28 &&
            result.conflicts.length > 0
          }
        />

        {import.meta.env.DEV ? (
          <div
            className="pointer-events-none absolute bottom-3 right-3 z-[80] max-w-[min(100vw-1rem,280px)] rounded-md border border-emerald-500/25 bg-black/75 px-2 py-1 font-mono text-[10px] text-emerald-200/90 shadow-sm"
            title="If this badge never updates after a code change, restart dev with npm run dev:fresh."
          >
            REGRID_DEV · shell-20260426b · flex+dock+map-poll
          </div>
        ) : null}
      </div>

      <SpatialCopilot
        allLayers={layers}
        enabledLayers={enabledLayers}
        mapboxToken={token}
        onApplyEnabledLayers={setEnabledLayers}
        shapeKind={activeTool ?? "circle"}
        flyTo={(c, z) => flyToRef.current(c, z)}
        statusLine={copilotStatusLine}
        onCopilotRunningChange={setCopilotRunning}
        onCopilotAnswer={setCopilotAnswer}
        showAnswerInRiskPanel={!!copilotAnswer}
        onApplyShape={(next) => {
          setShape(next);
          setHighlightedConflict(null);
        }}
        onApplyAnalysis={(next) => {
          setResult(next);
          setAnalysisState(next ? "result" : "idle");
        }}
      />
    </div>
  );
}
