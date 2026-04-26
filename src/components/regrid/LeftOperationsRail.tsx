import type { ReactNode } from "react";
import type { LayerDef, LayerId, ProjectKind, ShapeKind } from "@/lib/regrid/types";
import { Circle, Hand, Hexagon, Ruler, Square, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { motion } from "framer-motion";

export type { ProjectKind } from "@/lib/regrid/types";

function layerRowTooltip(layer: LayerDef): string {
  if (layer.hoverHelp) return layer.hoverHelp;
  return `Checked: draws "${layer.name}" on the map and includes it in the siting score. Unchecked: hides that overlay and removes it from scoring (${layer.agency}).`;
}

interface LeftOperationsRailProps {
  layers: LayerDef[];
  enabledLayers: Set<LayerId>;
  onToggleLayer: (id: LayerId) => void;

  projectKind: ProjectKind;
  onProjectKindChange: (kind: ProjectKind) => void;
  acreage: number;
  onAcreageChange: (acres: number) => void;

  activeTool: ShapeKind | null;
  onSelectTool: (kind: ShapeKind | null) => void;
  hasShape: boolean;
  onAnalyze: () => void;
  onFindBetterSite: () => void;
  onClear: () => void;
  analysisState: "idle" | "analyzing" | "result" | "relocating";
  copilotRunning: boolean;
}

const SHAPE_TOOLS: { kind: ShapeKind; label: string; icon: ReactNode }[] = [
  {
    kind: "circle",
    label: "Circle site",
    icon: <Circle className="h-[17px] w-[17px]" strokeWidth={1.5} />,
  },
  {
    kind: "square",
    label: "Square site",
    icon: <Square className="h-[17px] w-[17px]" strokeWidth={1.5} />,
  },
  {
    kind: "hexagon",
    label: "Hex site",
    icon: <Hexagon className="h-[17px] w-[17px]" strokeWidth={1.5} />,
  },
];

function ToolButton({
  active,
  busy,
  title,
  onClick,
  children,
  danger,
}: {
  active?: boolean;
  busy?: boolean;
  title: string;
  onClick?: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  if (active) {
    return (
      <button
        type="button"
        title={title}
        disabled={busy}
        onClick={onClick}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/50 bg-cyan-500/18 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.22),inset_0_0_8px_rgba(34,211,238,0.08)] transition duration-150 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {/* Active glow dot */}
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
        {children}
      </button>
    );
  }
  if (danger) {
    return (
      <button
        type="button"
        title={title}
        disabled={busy}
        onClick={onClick}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] text-white/45 transition duration-150 hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-35"
      >
        {children}
      </button>
    );
  }
  return (
    <button
      type="button"
      title={title}
      disabled={busy}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] text-white/50 transition duration-150 hover:border-cyan-300/22 hover:bg-cyan-500/9 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

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

  const missions = useMemo(
    () =>
      [
        { id: "solar" as const, label: "Solar" },
        { id: "battery" as const, label: "Battery" },
        { id: "grid-tied" as const, label: "Grid-tied" },
      ] as const,
    [],
  );

  const enabledCount = layers.filter((l) => enabledLayers.has(l.id)).length;

  return (
    <>
      {/* ── Tool rail ──────────────────────────────────────────── */}
      <motion.aside
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="pointer-events-auto absolute left-3 top-3 z-20 flex flex-col gap-1 rounded-2xl border border-white/[0.07] bg-[#060c14]/88 p-1.5 shadow-2xl backdrop-blur-xl"
      >
        {/* Pan */}
        <ToolButton
          active={activeTool === null}
          title="Pan map"
          onClick={() => onSelectTool(null)}
        >
          <Hand className="h-[17px] w-[17px]" strokeWidth={1.5} />
        </ToolButton>

        {/* Shape tools */}
        {SHAPE_TOOLS.map((t) => (
          <ToolButton
            key={t.kind}
            active={activeTool === t.kind}
            busy={busy}
            title={t.label}
            onClick={() => onSelectTool(t.kind)}
          >
            {t.icon}
          </ToolButton>
        ))}

        {/* Size hint */}
        <ToolButton busy={busy} title={`Site size · ${acreage} acres (adjust in site card)`}>
          <Ruler className="h-[17px] w-[17px]" strokeWidth={1.5} />
        </ToolButton>

        {/* Divider */}
        <div className="my-0.5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Clear */}
        <ToolButton danger busy={!hasShape || busy} title="Clear footprint" onClick={onClear}>
          <Trash2 className="h-[16px] w-[16px]" strokeWidth={1.5} />
        </ToolButton>
      </motion.aside>

      {/* ── Site config panel ──────────────────────────────────── */}
      <motion.aside
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: "easeOut", delay: 0.04 }}
        className="regrid-premium-panel pointer-events-auto absolute left-[4.4rem] top-3 z-20 w-[min(252px,calc(100vw-6rem))] rounded-2xl border border-white/[0.07] bg-[#060c14]/86 p-3 shadow-2xl backdrop-blur-xl"
      >
        {/* Inner top accent */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent" />

        <p className="text-[9.5px] font-semibold uppercase tracking-[0.22em] text-cyan-100/45">
          Site
        </p>

        {/* Project kind */}
        <div className="mt-2 flex gap-1">
          {missions.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={busy}
              onClick={() => onProjectKindChange(m.id)}
              className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] font-semibold transition duration-150 ${
                projectKind === m.id
                  ? "border-cyan-300/45 bg-cyan-500/16 text-cyan-50 shadow-[0_0_12px_rgba(34,211,238,0.18)]"
                  : "border-white/[0.07] bg-white/[0.02] text-white/45 hover:border-cyan-300/18 hover:text-cyan-100"
              } disabled:opacity-40`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Acreage slider */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-400">Size</span>
          <span className="font-mono text-[11px] tabular-nums text-cyan-100/80">{acreage} ac</span>
        </div>
        <input
          type="range"
          min={10}
          max={500}
          step={5}
          value={acreage}
          disabled={busy}
          onChange={(e) => onAcreageChange(Number(e.target.value))}
          className="mt-1 w-full accent-cyan-400 disabled:opacity-40"
        />

        {/* Action buttons */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onAnalyze}
            disabled={!hasShape || busy}
            className="rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 px-2 py-2 text-[11px] font-semibold text-[#020e18] shadow-[0_8px_18px_rgba(34,211,238,0.22)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {analysisState === "analyzing" ? "Scoring…" : "Run analysis"}
          </button>
          <button
            type="button"
            onClick={onFindBetterSite}
            disabled={!hasShape || busy}
            className="rounded-lg border border-cyan-200/18 bg-cyan-500/8 px-2 py-2 text-[11px] font-semibold text-cyan-100/85 transition hover:border-cyan-200/30 hover:bg-cyan-500/14 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {analysisState === "relocating" ? "Searching…" : "Optimize"}
          </button>
        </div>
      </motion.aside>

      {/* ── Layer panel ────────────────────────────────────────── */}
      <motion.aside
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.08 }}
        className="regrid-premium-panel pointer-events-auto absolute bottom-3 left-3 z-20 w-[min(272px,calc(100vw-1.5rem))] rounded-2xl border border-white/[0.07] bg-[#060c14]/86 p-3 shadow-2xl backdrop-blur-xl"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-cyan-300/25 to-transparent" />

        <div className="flex items-center justify-between">
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.22em] text-cyan-100/45">
            Layers
          </p>
          <span className="rounded-full border border-white/[0.07] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] text-slate-500">
            {enabledCount}/{layers.length}
          </span>
        </div>

        <ul className="mt-2.5 max-h-[28vh] space-y-0.5 overflow-y-auto pr-1">
          {layers.map((layer) => {
            const on = enabledLayers.has(layer.id);
            return (
              <li key={layer.id}>
                <label
                  className="group flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition duration-100 hover:bg-white/[0.04]"
                  title={layerRowTooltip(layer)}
                >
                  {/* Custom checkbox */}
                  <div className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => onToggleLayer(layer.id)}
                      className="sr-only"
                    />
                    <div
                      className={`h-3.5 w-3.5 rounded-[3px] border transition duration-150 ${
                        on
                          ? "border-transparent"
                          : "border-white/20 bg-transparent"
                      }`}
                      style={
                        on
                          ? {
                              backgroundColor: layer.color,
                              boxShadow: `0 0 6px ${layer.color}55`,
                            }
                          : undefined
                      }
                    >
                      {on && (
                        <svg
                          viewBox="0 0 10 10"
                          className="h-full w-full"
                          fill="none"
                        >
                          <path
                            d="M2 5l2.5 2.5 3.5-4"
                            stroke="#000"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Color dot */}
                  <span
                    className="h-2 w-2 shrink-0 rounded-full transition duration-150"
                    style={{
                      backgroundColor: on ? layer.color : "transparent",
                      border: on ? `1px solid ${layer.color}` : "1px solid rgba(255,255,255,0.15)",
                      boxShadow: on ? `0 0 5px ${layer.color}55` : undefined,
                    }}
                    aria-hidden
                  />

                  <span
                    className={`min-w-0 flex-1 truncate text-[11.5px] leading-tight transition duration-150 ${
                      on ? "text-[#ddeeff]" : "text-slate-600"
                    }`}
                  >
                    {layer.name}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </motion.aside>
    </>
  );
}
