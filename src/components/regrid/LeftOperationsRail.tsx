import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { LayerDef, LayerId, ShapeKind } from "@/lib/regrid/types";
import { ChevronDown, Circle, Hexagon, Square, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";

export type ProjectKind = "solar" | "battery" | "grid-tied";

interface LeftOperationsRailProps {
  layers: LayerDef[];
  enabledLayers: Set<LayerId>;
  onToggleLayer: (id: LayerId) => void;

  projectKind: ProjectKind;
  onProjectKindChange: (kind: ProjectKind) => void;
  acreage: number;
  onAcreageChange: (acres: number) => void;

  activeTool: ShapeKind | null;
  onSelectTool: (kind: ShapeKind) => void;
  hasShape: boolean;
  onAnalyze: () => void;
  onFindBetterSite: () => void;
  onClear: () => void;
  analysisState: "idle" | "analyzing" | "result" | "relocating";
  copilotRunning: boolean;
}

const TOOLS: { kind: ShapeKind; label: string; icon: ReactNode }[] = [
  { kind: "circle", label: "Circle", icon: <Circle className="h-4 w-4" strokeWidth={1.75} /> },
  { kind: "square", label: "Square", icon: <Square className="h-4 w-4" strokeWidth={1.75} /> },
  { kind: "hexagon", label: "Hex", icon: <Hexagon className="h-4 w-4" strokeWidth={1.75} /> },
];

export function LeftOperationsRail({
  layers,
  enabledLayers,
  onToggleLayer,
  projectKind,
  onProjectKindChange,
  acreage,
  onAcreageChange,
  activeTool,
  onSelectTool,
  hasShape,
  onAnalyze,
  onFindBetterSite,
  onClear,
  analysisState,
  copilotRunning,
}: LeftOperationsRailProps) {
  const busy = analysisState === "analyzing" || analysisState === "relocating" || copilotRunning;
  const [layersOpen, setLayersOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(true);

  const enabledCount = useMemo(() => enabledLayers.size, [enabledLayers]);

  const step = !hasShape
    ? 1
    : analysisState === "result"
      ? 3
      : 2;

  return (
    <motion.aside
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="pointer-events-auto absolute left-4 top-4 z-20 w-[min(300px,calc(100vw-1.5rem))] sm:left-8 sm:top-8 sm:w-[min(300px,calc(100vw-2.5rem))]"
    >
      <div className="flex gap-2">
        <div className={`glass flex max-h-[calc(100vh-220px)] flex-col overflow-hidden rounded-2xl border border-white/[0.08] shadow-sm transition-all duration-300 ${railOpen ? "w-full sm:w-[300px]" : "hidden"}`}>

        {/* Fixed title header */}
        <div className="shrink-0 border-b border-white/[0.06] px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <h1 className="truncate text-sm font-semibold tracking-tight">ReGrid</h1>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Demo
              </span>
            </div>
            <button
              type="button"
              title="Clear footprint"
              onClick={onClear}
              disabled={!hasShape || busy}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-muted-foreground transition hover:border-white/20 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Scrollable controls */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-4 p-4">

            {/* Workflow tracker */}
            <div className="rounded-xl border border-white/[0.06] bg-black/15 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-medium text-foreground/90">Workflow</p>
                <p className="text-[10px] text-muted-foreground">Step {step} / 3</p>
              </div>
              <div className="mt-1.5 grid grid-cols-3 gap-1">
                {[
                  { n: 1, label: "Place" },
                  { n: 2, label: "Analyze" },
                  { n: 3, label: "Decide" },
                ].map((s) => (
                  <div
                    key={s.n}
                    className={`rounded-lg px-2 py-1 text-center text-[10px] font-medium ${
                      step === s.n ? "bg-white/[0.06] text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Mission */}
            <div>
              <p className="mb-2 text-[10px] font-medium text-foreground/90">Mission</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: "solar" as const, label: "Solar" },
                    { id: "battery" as const, label: "Battery" },
                    { id: "grid-tied" as const, label: "Grid-tied" },
                  ] as const
                ).map((p) => {
                  const active = projectKind === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onProjectKindChange(p.id)}
                      disabled={busy}
                      className={`rounded-xl border px-2 py-1.5 text-[11px] font-semibold transition ${
                        active
                          ? "border-sky-400/35 bg-sky-400/10 text-sky-100"
                          : "border-white/10 bg-white/[0.02] text-muted-foreground hover:border-white/20 hover:text-foreground"
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Site size */}
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-medium text-foreground/90">Site size</p>
                <p className="text-[10px] tabular-nums text-muted-foreground">{acreage} ac</p>
              </div>
              <input
                type="range"
                min={10}
                max={500}
                step={5}
                value={acreage}
                disabled={busy}
                onChange={(e) => onAcreageChange(Number(e.target.value))}
                className="mt-2 w-full accent-sky-400 disabled:opacity-40"
              />
            </div>

            {/* Footprint tool */}
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-medium text-foreground/90">Footprint</p>
                <p className="text-[10px] text-muted-foreground">{hasShape ? "Anchored" : "None"}</p>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {TOOLS.map((t) => {
                  const active = activeTool === t.kind;
                  return (
                    <button
                      key={t.kind}
                      type="button"
                      onClick={() => onSelectTool(t.kind)}
                      disabled={busy}
                      className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[10px] font-medium transition ${
                        active
                          ? "border-primary/45 bg-primary/10 text-primary"
                          : "border-white/10 bg-white/[0.02] text-muted-foreground hover:border-white/20 hover:text-foreground"
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      <span className="text-foreground/90">{t.icon}</span>
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Evaluate */}
            <div className="border-t border-white/[0.06] pt-4">
              <p className="mb-2 text-[10px] font-medium text-foreground/90">Evaluate</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onAnalyze}
                  disabled={!hasShape || busy}
                  className="rounded-xl bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {analysisState === "analyzing" ? "Analyzing…" : "Analyze site"}
                </button>
                <button
                  type="button"
                  onClick={onFindBetterSite}
                  disabled={!hasShape || busy}
                  className="rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-[12px] font-semibold text-foreground/90 transition hover:border-white/25 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {analysisState === "relocating" ? "Searching…" : "Find better site"}
                </button>
              </div>
            </div>
          </div>

          {/* Layers section (inside scroll area) */}
          <div className="border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => setLayersOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/[0.02]"
            >
              <p className="text-[10px] font-medium text-foreground/90">Layers</p>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {enabledCount}/{layers.length}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-muted-foreground transition ${layersOpen ? "rotate-180" : ""}`}
                />
              </div>
            </button>

            {layersOpen && (
              <div className="space-y-1.5 px-3 pb-3">
                {layers.map((layer) => {
                  const on = enabledLayers.has(layer.id);
                  return (
                    <button
                      key={layer.id}
                      type="button"
                      onClick={() => onToggleLayer(layer.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition ${
                        on
                          ? "border-white/15 bg-white/[0.04]"
                          : "border-white/[0.06] bg-transparent hover:border-white/15 hover:bg-white/[0.03]"
                      }`}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: layer.color }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11px] font-medium leading-snug text-foreground">
                          {layer.name}
                        </div>
                        <div className="truncate text-[10px] text-muted-foreground">
                          {layer.agency}
                        </div>
                      </div>
                      <span
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition ${
                          on ? "border-primary/35 bg-primary/15" : "border-white/10 bg-black/20"
                        }`}
                        aria-hidden
                      >
                        <span
                          className={`ml-0.5 inline-block h-4 w-4 rounded-full bg-white/90 transition ${
                            on ? "translate-x-3.5" : "translate-x-0.5"
                          }`}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      {!railOpen && (
        <button
          type="button"
          onClick={() => setRailOpen(true)}
          className="glass flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-black/40 text-foreground shadow-sm transition hover:bg-white/[0.05]"
          title="Open operations rail"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
      {railOpen && (
        <button
          type="button"
          onClick={() => setRailOpen(false)}
          className="glass flex h-10 w-8 shrink-0 items-center justify-center rounded-r-2xl border-y border-r border-white/[0.08] bg-black/20 text-muted-foreground shadow-sm transition hover:bg-white/[0.05] hover:text-foreground"
          title="Collapse operations rail"
          style={{ transform: "translateX(-4px)" }}
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
        </button>
      )}
      </div>
    </motion.aside>
  );
}
