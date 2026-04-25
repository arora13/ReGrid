import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapCanvas } from "@/components/regrid/MapCanvas";
import { LayerStack } from "@/components/regrid/LayerStack";
import { ToolPalette } from "@/components/regrid/ToolPalette";
import { RiskPanel } from "@/components/regrid/RiskPanel";
import { TopBar } from "@/components/regrid/TopBar";
import { TokenGate } from "@/components/regrid/TokenGate";
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
  const [allShapesPlaced, setAllShapesPlaced] = useState(0);
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [highlightedConflict, setHighlightedConflict] = useState<LayerId | null>(null);

  const flyToRef = useRef<(c: [number, number], z?: number) => void>(() => {});

  const radiusForKind = (kind: ShapeKind) =>
    kind === "circle" ? 6500 : kind === "square" ? 6800 : 7200;

  const handleMapClick = (lngLat: [number, number]) => {
    if (!activeTool) return;
    const id = `shape-${Date.now()}`;
    const next = buildShape(activeTool, lngLat, radiusForKind(activeTool), id);
    setShape(next);
    setResult(null);
    setAnalysisState("idle");
    setAllShapesPlaced((n) => n + 1);
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
  };

  const layers = useMemo(() => LAYERS, []);

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
            "radial-gradient(ellipse at center, transparent 50%, oklch(0.1 0.02 240 / 0.55) 100%)",
        }}
      />

      <TopBar
        shapeCount={allShapesPlaced}
        hasResult={analysisState === "result"}
        riskScore={result?.score ?? null}
      />

      <LayerStack layers={layers} enabled={enabledLayers} onToggle={handleToggleLayer} />

      <RiskPanel
        state={analysisState}
        result={result}
        onAnalyze={handleAnalyze}
        onRelocate={handleRelocate}
        onHoverConflict={setHighlightedConflict}
        hasShape={!!shape}
      />

      <ToolPalette
        active={activeTool}
        onSelect={setActiveTool}
        onClear={handleClear}
        hasShape={!!shape}
      />
    </div>
  );
}
