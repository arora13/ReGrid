import type { ReactNode } from "react";
import type { LayerDef, LayerId, ProjectKind, ShapeKind } from "@/lib/regrid/types";
import { Circle, Hand, Hexagon, Ruler, Square, Trash2 } from "lucide-react";
import { useMemo } from "react";

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

const TOOL_BASE =
  "flex h-10 w-10 items-center justify-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-40";

const SHAPE_TOOLS: { kind: ShapeKind; label: string; icon: ReactNode }[] = [
  { kind: "circle", label: "Circle site", icon: <Circle className="h-[18px] w-[18px]" strokeWidth={1.6} /> },
  { kind: "square", label: "Square site", icon: <Square className="h-[18px] w-[18px]" strokeWidth={1.6} /> },
  { kind: "hexagon", label: "Hex site", icon: <Hexagon className="h-[18px] w-[18px]" strokeWidth={1.6} /> },
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
    () =>
      [
        { id: "solar" as const, label: "Solar" },
        { id: "battery" as const, label: "Battery" },
        { id: "grid-tied" as const, label: "Grid-tied" },
      ] as const,
    [],
  );

  const activeShape = `${TOOL_BASE} border-sky-400/50 bg-sky-500/15 text-sky-200`;
  const idleShape = `${TOOL_BASE} border-white/[0.08] bg-white/[0.04] text-white/55 hover:border-white/15 hover:bg-white/[0.07] hover:text-white/80`;

  return (
    <>
      <aside className="pointer-events-auto absolute left-3 top-3 z-20 flex flex-col gap-1 rounded-lg border border-white/[0.06] bg-[#0d1117]/95 p-1 shadow-xl backdrop-blur-xl">
        <button
          type="button"
          title="Pan map"
          className={activeTool === null ? activeShape : idleShape}
          onClick={() => onSelectTool(null)}
        >
          <Hand className="h-[18px] w-[18px]" strokeWidth={1.6} />
        </button>
        {SHAPE_TOOLS.map((t) => (
          <button
            key={t.kind}
            type="button"
            title={t.label}
            disabled={busy}
            className={activeTool === t.kind ? activeShape : idleShape}
            onClick={() => onSelectTool(t.kind)}
          >
            {t.icon}
          </button>
        ))}
        <button
          type="button"
          title={`Site size · ${acreage} acres (adjust in site card)`}
          disabled={busy}
          className={idleShape}
        >
          <Ruler className="h-[18px] w-[18px]" strokeWidth={1.6} />
        </button>
        <div className="my-0.5 h-px bg-white/[0.08]" />
        <button
          type="button"
          title="Clear footprint"
          disabled={!hasShape || busy}
          className={`${TOOL_BASE} border-white/[0.08] bg-white/[0.04] text-white/55 hover:border-rose-400/35 hover:bg-rose-500/10 hover:text-rose-200 disabled:opacity-35`}
          onClick={onClear}
        >
          <Trash2 className="h-[17px] w-[17px]" strokeWidth={1.6} />
        </button>
      </aside>

      <aside className="pointer-events-auto absolute left-[4.25rem] top-3 z-20 w-[min(240px,calc(100vw-6rem))] rounded-lg border border-white/[0.06] bg-[#0d1117]/95 p-3 shadow-xl backdrop-blur-xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#64748b]">Site</p>
        <div className="mt-2 flex gap-1">
          {missions.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={busy}
              onClick={() => onProjectKindChange(m.id)}
              className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] font-semibold transition ${
                projectKind === m.id
                  ? "border-sky-400/40 bg-sky-500/15 text-sky-100"
                  : "border-white/[0.08] bg-white/[0.03] text-white/55 hover:border-white/15 hover:text-white/85"
              } disabled:opacity-40`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[11px] text-[#94a3b8]">Size</span>
          <span className="text-[11px] tabular-nums text-[#cbd5e1]">{acreage} ac</span>
        </div>
        <input
          type="range"
          min={10}
          max={500}
          step={5}
          value={acreage}
          disabled={busy}
          onChange={(e) => onAcreageChange(Number(e.target.value))}
          className="mt-1 w-full accent-sky-400 disabled:opacity-40"
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onAnalyze}
            disabled={!hasShape || busy}
            className="rounded-md bg-[#60a5fa] px-2 py-2 text-[11px] font-semibold text-[#0a0e14] shadow-sm transition hover:bg-[#93c5fd] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {analysisState === "analyzing" ? "Scoring…" : "Run analysis"}
          </button>
          <button
            type="button"
            onClick={onFindBetterSite}
            disabled={!hasShape || busy}
            className="rounded-md border border-white/[0.12] bg-white/[0.05] px-2 py-2 text-[11px] font-semibold text-white/85 transition hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {analysisState === "relocating" ? "Searching…" : "Optimize"}
          </button>
        </div>
      </aside>

      <aside className="pointer-events-auto absolute bottom-24 left-3 z-20 w-[min(260px,calc(100vw-1.5rem))] rounded-lg border border-white/[0.06] bg-[#0d1117]/95 p-3 shadow-xl backdrop-blur-xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#64748b]">Layers</p>
        <ul className="mt-2 max-h-[28vh] space-y-1.5 overflow-y-auto pr-1">
          {layers.map((layer) => {
            const on = enabledLayers.has(layer.id);
            return (
              <li key={layer.id}>
                <label
                  className="flex cursor-help items-center gap-3 rounded-md px-1 py-1.5 transition hover:bg-white/[0.04]"
                  title={layerRowTooltip(layer)}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => onToggleLayer(layer.id)}
                    className="h-3.5 w-3.5 rounded border-[#334155] bg-[#0a0e14] text-[#60a5fa] focus:ring-[#60a5fa]/30"
                  />
                  <span
                    className="h-3 w-3 shrink-0 rounded-[2px] border border-white/[0.08] shadow-inner"
                    style={{ backgroundColor: on ? layer.color : "transparent", boxShadow: on ? `0 0 0 1px ${layer.color}55` : undefined }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-[12px] leading-tight text-[#e2e8f0]">{layer.name}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </aside>
    </>
  );
}
