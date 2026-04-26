import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapCanvas } from "@/components/regrid/MapCanvas";
import { TokenGate } from "@/components/regrid/TokenGate";
import { SpatialCopilot } from "@/components/regrid/SpatialCopilot";
import { LeftOperationsRail } from "@/components/regrid/LeftOperationsRail";
import { RiskScoreHUD } from "@/components/regrid/RiskScoreHUD";
import { WorkspaceHeader, workspaceProjectLabel } from "@/components/regrid/WorkspaceHeader";
import { UserAuthGate } from "@/components/regrid/UserAuthGate";
import { UserDashboard } from "@/components/regrid/UserDashboard";
import { LAYERS } from "@/lib/regrid/layers";
import { loadManifestLayers } from "@/lib/regrid/datasets";
import { clampLngLatToCalifornia, LOCAL_RELOCATE_MAX_OFFSET_DEG } from "@/lib/regrid/california";
import { buildShape, distanceMeters } from "@/lib/regrid/geo";
import { analyzeShape, findOptimalRelocation } from "@/lib/regrid/analyze";
import {
  federalScreenFootprintFn,
  mergeFederalScreenIntoAnalysis,
} from "@/lib/regrid/real-dataset-screen";
import { getPublicMapboxTokenFromEnv } from "@/lib/regrid/env";
import {
  addUserActivity,
  getSessionEmail,
  getUserActivity,
  logoutUser,
  type UserActivity,
} from "@/lib/regrid/user-store";
import type {
  AnalysisResult,
  Conflict,
  DrawnShape,
  LayerDef,
  LayerId,
  ProjectKind,
  ShapeKind,
} from "@/lib/regrid/types";

export const Route = createFileRoute("/app")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ReGrid · Spatial Intelligence Platform" },
      {
        name: "description",
        content:
          "Enterprise spatial intelligence dashboard for siting clean energy infrastructure.",
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

function parseShapeKind(value: string | null): ShapeKind | null {
  if (value === "circle" || value === "square" || value === "hexagon") return value;
  return null;
}

function parseProjectKind(value: string | null): ProjectKind | null {
  if (value === "solar" || value === "battery" || value === "grid-tied") return value;
  return null;
}

function summarizeAvoided(before: Conflict[] | null, after: Conflict[] | null): string | null {
  if (!before?.length) return null;
  const afterLabels = new Set((after ?? []).map((c) => c.label));
  const removed = before.find((c) => !afterLabels.has(c.label));
  if (!removed) return null;
  if (removed.layerId === "usda-wildfire") return "Wildfire exposure reduced materially.";
  if (removed.layerId === "epa-ejscreen") return "Equity-priority overlap avoided.";
  if (removed.layerId === "hifld-transmission" || removed.layerId === "eia-grid")
    return "Major grid conflict removed (check corridor proximity).";
  if (typeof removed.layerId === "string" && removed.layerId.startsWith("ext:"))
    return "Imported dataset conflict reduced — review map highlights.";
  return "Top conflict driver changed — review map highlights.";
}

function RegridApp() {
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [activity, setActivity] = useState<UserActivity[]>([]);
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

  useEffect(() => {
    const email = getSessionEmail();
    setSessionEmail(email);
    if (email) setActivity(getUserActivity(email));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const lngRaw = params.get("lng");
    const latRaw = params.get("lat");
    if (!lngRaw || !latRaw) return;

    const lng = Number(lngRaw);
    const lat = Number(latRaw);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

    const sharedAcreage = Number(params.get("acres") ?? "");
    const nextAcreage =
      Number.isFinite(sharedAcreage) && sharedAcreage >= 10 && sharedAcreage <= 500
        ? Math.round(sharedAcreage / 5) * 5
        : 50;
    const sharedTool = parseShapeKind(params.get("tool")) ?? "circle";
    const sharedProject = parseProjectKind(params.get("project"));

    if (sharedProject) setProjectKind(sharedProject);
    setAcreage(nextAcreage);
    setActiveTool(sharedTool);
    setShape(
      buildShape(
        sharedTool,
        clampLngLatToCalifornia([lng, lat]),
        acresToRadiusMeters(nextAcreage),
        `shape-${Date.now()}`,
      ),
    );
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
  const [layers, setLayers] = useState<LayerDef[]>(() => [...LAYERS]);
  const layersRef = useRef(layers);
  layersRef.current = layers;

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

  const handleShare = () => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (shape) {
      params.set("lng", shape.center[0].toFixed(6));
      params.set("lat", shape.center[1].toFixed(6));
      params.set("acres", String(acreage));
      params.set("tool", shape.kind);
      params.set("project", projectKind);
    }
    const url = `${window.location.origin}/app${params.toString() ? `?${params.toString()}` : ""}`;
    void navigator.clipboard.writeText(url).catch(() => {
      /* no-op: clipboard may be blocked in some browsers */
    });
  };

  const handleExport = () => {
    if (typeof window === "undefined") return;
    const payload = {
      exportedAt: new Date().toISOString(),
      projectKind,
      acreage,
      enabledLayers: Array.from(enabledLayers),
      shape,
      result,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `regrid-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
  };

  const handleMapClick = (lngLat: [number, number]) => {
    if (copilotRunning || !activeTool) return;
    setCopilotAnswer(null);
    const next = buildShape(
      activeTool,
      clampLngLatToCalifornia(lngLat),
      radiusMeters,
      `shape-${Date.now()}`,
    );
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
    if (result) setResult(null);
    if (analysisState === "result") setAnalysisState("idle");
  };

  const handleAnalyze = () => {
    if (!shape) return;
    setCopilotAnswer(null);
    setAnalysisState("analyzing");
    setResult(null);
    setTimeout(() => {
      void (async () => {
        let r = analyzeShape(shape, enabledLayers, layersRef.current);
        try {
          const poly = shape.geojson.geometry;
          if (poly.type === "Polygon" && poly.coordinates[0]?.length) {
            const ring = poly.coordinates[0].map(([lng, lat]) => [lng, lat]);
            const snap = await federalScreenFootprintFn({ data: { ring } });
            r = mergeFederalScreenIntoAnalysis(r, snap);
          }
        } catch {
          /* keep mock-only result */
        }
        setResult(r);
        setAnalysisState("result");
        if (sessionEmail) {
          addUserActivity(sessionEmail, {
            type: "analysis",
            text: `Analyzed ${acreage} ac near ${shape.center[1].toFixed(3)}, ${shape.center[0].toFixed(3)}`,
            score: r.score,
          });
          setActivity(getUserActivity(sessionEmail));
        }
      })();
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
        { maxOffsetDeg: LOCAL_RELOCATE_MAX_OFFSET_DEG },
      );
      flyToRef.current(center, 9.2);
      setTimeout(() => {
        setShape(buildShape(shape.kind, center, shape.radiusMeters, `shape-${Date.now()}`));
        setResult(newResult);
        setAnalysisState("result");
        setShapePulse(true);
        if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
        pulseTimerRef.current = window.setTimeout(() => setShapePulse(false), 2600);
        setCompare({
          beforeScore: prevScoreRef.current,
          afterScore: newResult.score,
          movedKm: distanceMeters(beforeCenter, center) / 1000,
          headline: summarizeAvoided(beforeConflicts, newResult.conflicts),
        });
        if (ghostTimerRef.current) window.clearTimeout(ghostTimerRef.current);
        ghostTimerRef.current = window.setTimeout(() => setGhostShape(null), 6500);
        if (sessionEmail) {
          addUserActivity(sessionEmail, {
            type: "optimize",
            text: `Optimized site by ${(distanceMeters(beforeCenter, center) / 1000).toFixed(1)} km`,
            score: newResult.score,
          });
          setActivity(getUserActivity(sessionEmail));
        }
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
    if (!relocateArmedRef.current || analysisState !== "result" || !result) return;
    const before = prevScoreRef.current;
    const after = result.score;
    if (before !== null && after < before) {
      setRelocateSuccess(true);
      const t = window.setTimeout(() => setRelocateSuccess(false), 5200);
      relocateArmedRef.current = false;
      return () => window.clearTimeout(t);
    }
    relocateArmedRef.current = false;
  }, [analysisState, result]);

  if (!sessionEmail) {
    return (
      <UserAuthGate
        onAuthenticated={(email) => {
          setSessionEmail(email);
          setActivity(getUserActivity(email));
        }}
      />
    );
  }

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
    <div className="regrid-workspace fixed inset-0 z-0 flex flex-col overflow-hidden bg-[#04080e]">
      <WorkspaceHeader projectKind={projectKind} onShare={handleShare} onExport={handleExport} />
      <div className="relative min-h-0 min-w-0 flex-1">
        <div className="absolute inset-0 z-0">
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
          <div className="pointer-events-none absolute left-1/2 top-[38%] z-[15] -translate-x-1/2 -translate-y-full text-center">
            <p className="map-text font-mono text-[9px] tracking-[0.3em] text-white/30 uppercase">
              Site · {projectKind}
            </p>
            <p className="map-text mt-0.5 text-[13px] font-semibold text-white/70">
              {workspaceProjectLabel(projectKind)}
            </p>
            <p className="map-text mt-0.5 font-mono text-[10px] text-white/28">
              {siteAreaKm2Label} km² · {shape.kind} · {(shape.radiusMeters / 1000).toFixed(1)} km
            </p>
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
        <UserDashboard
          email={sessionEmail}
          activity={activity}
          onLogout={() => {
            logoutUser();
            setSessionEmail(null);
            setActivity([]);
          }}
        />
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
        onCommandSubmitted={(command) => {
          if (!sessionEmail) return;
          addUserActivity(sessionEmail, { type: "search", text: command });
          setActivity(getUserActivity(sessionEmail));
        }}
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
