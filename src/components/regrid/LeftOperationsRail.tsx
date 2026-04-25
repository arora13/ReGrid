import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { LayerDef, LayerId, ShapeKind } from "@/lib/regrid/types";
import { ChevronDown, Circle, Hexagon, Square, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

interface LeftOperationsRailProps {
  layers: LayerDef[];
  enabledLayers: Set<LayerId>;
  onToggleLayer: (id: LayerId) => void;

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
  const [layersOpen, setLayersOpen] = useState(true);

  const enabledCount = useMemo(() => enabledLayers.size, [enabledLayers]);

  return (
    <motion.aside
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="pointer-events-auto absolute top-8 left-8 z-20 w-[min(360px,calc(100vw-2rem))]"
    >
      <div className="glass flex max-h-[calc(100vh-7.25rem)] flex-col overflow-hidden rounded-2xl border border-white/[0.08] shadow-sm">
        <div className="shrink-0 border-b border-white/[0.06] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <h1 className="truncate text-base font-semibold tracking-tight">ReGrid</h1>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Demo
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Map-first siting: place a footprint, score conflicts, then optimize.
              </p>
            </div>

            <button
              type="button"
              title="Clear footprint"
              onClick={onClear}
              disabled={!hasShape || busy}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-muted-foreground transition hover:border-white/20 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>

          <div className="mt-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium text-foreground/90">Footprint</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Pick a tool, click the map.</p>
              </div>
              <p className="text-[10px] text-muted-foreground">{hasShape ? "Anchored" : "None"}</p>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              {TOOLS.map((t) => {
                const active = activeTool === t.kind;
                return (
                  <button
                    key={t.kind}
                    type="button"
                    onClick={() => onSelectTool(t.kind)}
                    disabled={busy}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-medium transition ${
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

          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <p className="text-[11px] font-medium text-foreground/90">Evaluate</p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={onAnalyze}
                disabled={!hasShape || busy}
                className="rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {analysisState === "analyzing" ? "Analyzing…" : "Analyze site"}
              </button>
              <button
                type="button"
                onClick={onFindBetterSite}
                disabled={!hasShape || busy}
                className="rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2.5 text-sm font-semibold text-foreground/90 transition hover:border-white/25 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {analysisState === "relocating" ? "Searching…" : "Find better site"}
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <button
            type="button"
            onClick={() => setLayersOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 text-left transition hover:bg-white/[0.02]"
          >
            <div>
              <p className="text-[11px] font-medium text-foreground/90">Layers</p>
              <p className="text-[11px] text-muted-foreground">Constraints included in scoring</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {enabledCount}/{layers.length}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition ${layersOpen ? "rotate-180" : ""}`}
              />
            </div>
          </button>

          {layersOpen && (
            <div className="max-h-[42vh] overflow-y-auto px-3 pb-3 pt-2 sm:max-h-[46vh]">
              <div className="space-y-1.5">
                {layers.map((layer) => {
                  const on = enabledLayers.has(layer.id);
                  return (
                    <button
                      key={layer.id}
                      type="button"
                      onClick={() => onToggleLayer(layer.id)}
                      className={`flex w-full items-start gap-3 rounded-xl border px-2.5 py-2 text-left transition ${
                        on
                          ? "border-white/15 bg-white/[0.04]"
                          : "border-white/[0.06] bg-transparent hover:border-white/15 hover:bg-white/[0.03]"
                      }`}
                    >
                      <span
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: layer.color }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-medium leading-snug text-foreground [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden">
                          {layer.name}
                        </div>
                        <div className="mt-0.5 text-[10px] leading-snug text-muted-foreground [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden">
                          {layer.agency}
                        </div>
                      </div>
                      <span
                        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition ${
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
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
