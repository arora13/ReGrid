import type { ReactNode } from "react";
import type { LayerDef, LayerId, ProjectKind, ShapeKind } from "@/lib/regrid/types";
import { Circle, Hand, Hexagon, Square, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { motion } from "framer-motion";

export type { ProjectKind } from "@/lib/regrid/types";

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

const PANEL = "rounded-xl border border-white/[0.09] bg-[#060e1c]/90 backdrop-blur-xl shadow-xl";

const SHAPE_TOOLS: { kind: ShapeKind; label: string; icon: ReactNode }[] = [
  { kind: "circle",  label: "Circle",  icon: <Circle  className="h-[15px] w-[15px]" strokeWidth={1.5} /> },
  { kind: "square",  label: "Square",  icon: <Square  className="h-[15px] w-[15px]" strokeWidth={1.5} /> },
  { kind: "hexagon", label: "Hexagon", icon: <Hexagon className="h-[15px] w-[15px]" strokeWidth={1.5} /> },
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

  const missions = useMemo(
    () => [
      { id: "solar"    as const, label: "Solar"    },
      { id: "battery"  as const, label: "Battery"  },
      { id: "grid-tied"as const, label: "Grid-tied"},
    ] as const,
    [],
  );

  return (
    <>
      {/* ── Tool rail ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className={`pointer-events-auto absolute left-3 top-3 z-20 flex flex-col gap-0.5 p-1.5 ${PANEL}`}
      >
        {/* Pan */}
        <ToolBtn
          active={activeTool === null}
          title="Pan map"
          onClick={() => onSelectTool(null)}
        >
          <Hand className="h-[15px] w-[15px]" strokeWidth={1.5} />
        </ToolBtn>

        {SHAPE_TOOLS.map((t) => (
          <ToolBtn
            key={t.kind}
            active={activeTool === t.kind}
            disabled={busy}
            title={t.label}
            onClick={() => onSelectTool(t.kind)}
          >
            {t.icon}
          </ToolBtn>
        ))}

        <div className="my-0.5 h-px bg-white/[0.07]" />

        {/* Clear */}
        <button
          type="button"
          title="Clear site"
          disabled={!hasShape || busy}
          onClick={onClear}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition hover:bg-rose-500/15 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-25"
        >
          <Trash2 className="h-[14px] w-[14px]" strokeWidth={1.5} />
        </button>
      </motion.div>

      {/* ── Site config panel ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className={`pointer-events-auto absolute left-[3.25rem] top-3 z-20 w-[220px] p-3 ${PANEL}`}
      >
        <p className="mb-2 font-mono text-[9px] tracking-[0.25em] text-white/30 uppercase">
          Site type
        </p>

        {/* Project kind tabs */}
        <div className="flex rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
          {missions.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={busy}
              onClick={() => onProjectKindChange(m.id)}
              className={[
                "flex-1 rounded-md py-1 text-[11px] font-medium transition duration-150 disabled:opacity-40",
                projectKind === m.id
                  ? "bg-white/12 text-white shadow-sm"
                  : "text-white/35 hover:text-white/65",
              ].join(" ")}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Acreage */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-white/40">Site size</span>
          <span className="font-mono text-[11px] tabular-nums text-white/60">{acreage} ac</span>
        </div>
        <input
          type="range"
          min={10}
          max={500}
          step={5}
          value={acreage}
          disabled={busy}
          onChange={(e) => onAcreageChange(Number(e.target.value))}
          className="mt-1.5 w-full cursor-pointer accent-white disabled:opacity-30"
        />

        {/* Action buttons */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onAnalyze}
            disabled={!hasShape || busy}
            className="rounded-lg bg-white/10 py-2 text-[11px] font-semibold text-white/80 transition hover:bg-white/18 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            {analysisState === "analyzing" ? "Scoring…" : "Analyze"}
          </button>
          <button
            type="button"
            onClick={onFindBetterSite}
            disabled={!hasShape || busy}
            className="rounded-lg border border-white/[0.09] py-2 text-[11px] font-medium text-white/45 transition hover:border-white/18 hover:text-white/75 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {analysisState === "relocating" ? "Searching…" : "Optimize"}
          </button>
        </div>

        {!hasShape && (
          <p className="mt-2.5 text-center text-[10px] text-white/20">
            Click the map to place a site
          </p>
        )}
      </motion.div>

      {/* ── Layer panel — positioned above the copilot bar ─────── */}
      {/* bottom-[90px] clears the ~80px copilot bar + buffer       */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className={`pointer-events-auto absolute bottom-[90px] left-3 z-20 w-[220px] p-3 ${PANEL}`}
      >
        <p className="mb-2.5 font-mono text-[9px] tracking-[0.25em] text-white/30 uppercase">
          Layers
        </p>
        <ul className="max-h-[26vh] space-y-0.5 overflow-y-auto">
          {layers.map((layer) => {
            const on = enabledLayers.has(layer.id);
            return (
              <li key={layer.id}>
                <button
                  type="button"
                  onClick={() => onToggleLayer(layer.id)}
                  className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left transition hover:bg-white/[0.04]"
                >
                  {/* Color swatch / checkbox */}
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition duration-150"
                    style={{
                      backgroundColor: on ? layer.color : "transparent",
                      borderColor: on ? layer.color : "rgba(255,255,255,0.18)",
                      boxShadow: on ? `0 0 6px ${layer.color}55` : undefined,
                    }}
                  >
                    {on && (
                      <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none">
                        <path d="M2 5l2 2.5 4-4" stroke="#000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className={`truncate text-[11.5px] transition duration-150 ${on ? "text-white/65" : "text-white/25"}`}>
                    {layer.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </motion.div>
    </>
  );
}

// ── Tool button ──────────────────────────────────────────────────────────────
function ToolBtn({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  title: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={[
        "flex h-8 w-8 items-center justify-center rounded-lg transition duration-150",
        "disabled:cursor-not-allowed disabled:opacity-30",
        active
          ? "bg-white text-[#06101e] shadow-[0_0_10px_rgba(255,255,255,0.15)]"
          : "text-white/45 hover:bg-white/10 hover:text-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
