import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapCanvas } from "@/components/regrid/MapCanvas";
import { TokenGate } from "@/components/regrid/TokenGate";
import { SpatialCopilot } from "@/components/regrid/SpatialCopilot";
import { ProjectControlPanel } from "@/components/regrid/ProjectControlPanel";
import { LayersDock } from "@/components/regrid/LayersDock";
import { RiskScoreHUD } from "@/components/regrid/RiskScoreHUD";
import { LAYERS } from "@/lib/regrid/layers";
import { buildShape } from "@/lib/regrid/geo";
import { analyzeShape, findOptimalRelocation } from "@/lib/regrid/analyze";
import { getPublicMapboxTokenFromEnv } from "@/lib/regrid/env";
import type {
  AnalysisResult,
  DrawnShape,
  LayerId,
  ShapeKind,
} from "@/lib/regrid/types";

export const Route = createFileRoute("/")({
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
    () => new Set<LayerId>(["hifld-transmission", "usda-wildfire", "epa-ejscreen"]),
  );
  const [activeTool, setActiveTool] = useState<ShapeKind | null>("circle");
  const [shape, setShape] = useState<DrawnShape | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [highlightedConflict, setHighlightedConflict] = useState<LayerId | null>(null);
  const [copilotRunning, setCopilotRunning] = useState(false);
  const [relocateSuccess, setRelocateSuccess] = useState(false);
  const prevScoreRef = useRef<number | null>(null);
  const relocateArmedRef = useRef(false);

  const flyToRef = useRef<(c: [number, number], z?: number) => void>(() => {});

  const radiusForKind = (kind: ShapeKind) =>
    kind === "circle" ? 6500 : kind === "square" ? 6800 : 7200;

  const handleMapClick = (lngLat: [number, number]) => {
    if (copilotRunning) return;
    if (!activeTool) return;
    const id = `shape-${Date.now()}`;
    const next = buildShape(activeTool, lngLat, radiusForKind(activeTool), id);
    setShape(next);
    setResult(null);
    setAnalysisState("idle");
    flyToRef.current(lngLat, Math.max(8.4, 8.4));
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
    setAnalysisState("analyzing");
    setResult(null);
    setTimeout(() => {
      const r = analyzeShape(shape, enabledLayers);
      setResult(r);
      setAnalysisState("result");
    }, 2000);
  };

  const handleRelocate = () => {
    if (!shape) return;
    setAnalysisState("relocating");
    setHighlightedConflict(null);
    relocateArmedRef.current = true;
    prevScoreRef.current = result?.score ?? null;
    setRelocateSuccess(false);
    setTimeout(() => {
      const { center, result: newResult } = findOptimalRelocation(shape, enabledLayers);
      flyToRef.current(center, 9.2);
      setTimeout(() => {
        const newShape = buildShape(shape.kind, center, shape.radiusMeters, `shape-${Date.now()}`);
        setShape(newShape);
        setResult(newResult);
        setAnalysisState("result");
      }, 900);
    }, 1600);
  };

  const handleClear = () => {
    setShape(null);
    setResult(null);
    setAnalysisState("idle");
    setHighlightedConflict(null);
    setRelocateSuccess(false);
    relocateArmedRef.current = false;
    prevScoreRef.current = null;
  };

  const layers = useMemo(() => LAYERS, []);

  useEffect(() => {
    if (!relocateArmedRef.current) return;
    if (analysisState !== "result" || !result) return;
    const before = prevScoreRef.current;
    const after = result.score;
    if (before !== null && after < before) {
      setRelocateSuccess(true);
      const t = window.setTimeout(() => setRelocateSuccess(false), 3800);
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
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      <MapCanvas
        token={token}
        layers={layers}
        enabledLayers={enabledLayers}
        shape={shape}
        highlightedConflict={highlightedConflict}
        crosshair={!!activeTool && !copilotRunning}
        onMapClick={handleMapClick}
        onMapReady={(fly) => {
          flyToRef.current = fly;
        }}
      />

      {/* Subtle vignette + grid for depth */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 62%, oklch(0.1 0.02 240 / 0.34) 100%)",
        }}
      />

      <ProjectControlPanel
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        hasShape={!!shape}
        onAnalyze={handleAnalyze}
        onFindBetterSite={handleRelocate}
        onClear={handleClear}
        analysisState={analysisState}
        copilotRunning={copilotRunning}
      />

      <LayersDock layers={layers} enabled={enabledLayers} onToggle={handleToggleLayer} />

      <RiskScoreHUD
        hasShape={!!shape}
        analysisState={analysisState}
        result={result}
        onHoverConflict={setHighlightedConflict}
        relocateSuccess={relocateSuccess}
      />

      <SpatialCopilot
        enabledLayers={enabledLayers}
        shapeKind={activeTool ?? "circle"}
        flyTo={(c, z) => flyToRef.current(c, z)}
        onCopilotRunningChange={setCopilotRunning}
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
