import type { ReactNode } from "react";
import type { LayerDef, LayerId, ProjectKind, ShapeKind } from "@/lib/regrid/types";
import { Circle, Hand, Hexagon, Ruler, Square, Trash2, Upload } from "lucide-react";
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

const SHAPE_TOOLS: { kind: ShapeKind; label: string; icon: ReactNode }[] = [
  { kind: "circle", label: "Circle site", icon: <Circle strokeWidth={1.4} className="h-4 w-4" /> },
  { kind: "square", label: "Square site", icon: <Square strokeWidth={1.4} className="h-4 w-4" /> },
  { kind: "hexagon", label: "Hex site", icon: <Hexagon strokeWidth={1.4} className="h-4 w-4" /> },
];

function IconBtn({
  active,
  disabled,
  title,
  onClick,
  children,
  danger,
}: {
  active?: boolean;
  disabled?: boolean;
  title: string;
  onClick?: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={[
        "flex h-9 w-9 items-center justify-center rounded-lg transition duration-150 disabled:cursor-not-allowed disabled:opacity-30",
        active
          ? "bg-white/12 text-white"
          : danger
            ? "text-white/25 hover:bg-rose-500/12 hover:text-rose-300"
            : "text-white/28 hover:bg-white/8 hover:text-white/70",
      ].join(" ")}
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

  return (
    <>
      {/* ── Left gradient fade ─────────────────────────────── */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-56 bg-gradient-to-r from-black/50 via-black/15 to-transparent" />

      {/* ── Tool icon rail ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="pointer-events-auto absolute left-4 top-1/2 z-20 -translate-y-1/2 flex flex-col gap-0.5"
      >
        <IconBtn title="Pan map" active={activeTool === null} onClick={() => onSelectTool(null)}>
          <Hand strokeWidth={1.4} className="h-4 w-4" />
        </IconBtn>

        {SHAPE_TOOLS.map((t) => (
          <IconBtn
            key={t.kind}
            title={t.label}
            active={activeTool === t.kind}
            disabled={busy}
            onClick={() => onSelectTool(t.kind)}
          >
            {t.icon}
          </IconBtn>
        ))}

        <IconBtn title={`Site size · ${acreage} ac`} disabled={busy}>
          <Ruler strokeWidth={1.4} className="h-4 w-4" />
        </IconBtn>

        <div className="my-1 h-px bg-white/[0.07]" />

        <IconBtn title="Import dataset" disabled={busy}>
          <Upload strokeWidth={1.4} className="h-4 w-4" />
        </IconBtn>

        <IconBtn title="Clear footprint" danger disabled={!hasShape || busy} onClick={onClear}>
          <Trash2 strokeWidth={1.4} className="h-3.5 w-3.5" />
        </IconBtn>
      </motion.div>

      {/* ── Site config (floating, left of tools) ─────────── */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.06 }}
        className="pointer-events-auto absolute left-16 top-4 z-20 w-[200px]"
      >
        {/* Project kind */}
        <p className="map-text font-mono text-[9px] tracking-[0.28em] text-white/22 uppercase">
          Site
        </p>
        <div className="mt-2 flex gap-1.5">
          {missions.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={busy}
              onClick={() => onProjectKindChange(m.id)}
              className={[
                "rounded px-2.5 py-1 text-[11px] font-medium transition duration-150 disabled:opacity-40",
                projectKind === m.id
                  ? "bg-white/12 text-white"
                  : "text-white/28 hover:bg-white/6 hover:text-white/60",
              ].join(" ")}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Acreage */}
        <div className="mt-3 flex items-center justify-between">
          <span className="map-text text-[11px] text-white/28">Size</span>
          <span className="map-text font-mono text-[11px] tabular-nums text-white/40">
            {acreage} ac
          </span>
        </div>
        <input
          type="range"
          min={10}
          max={500}
          step={5}
          value={acreage}
          disabled={busy}
          onChange={(e) => onAcreageChange(Number(e.target.value))}
          className="mt-1 w-full accent-white/60 opacity-40 hover:opacity-70 disabled:opacity-20"
        />

        {/* Actions */}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onAnalyze}
            disabled={!hasShape || busy}
            className="map-text rounded px-3 py-1.5 text-[11px] font-semibold text-white/70 ring-1 ring-white/15 transition hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            {analysisState === "analyzing" ? "Scoring…" : "Run analysis"}
          </button>
          <button
            type="button"
            onClick={onFindBetterSite}
            disabled={!hasShape || busy}
            className="map-text rounded px-3 py-1.5 text-[11px] font-medium text-white/35 transition hover:text-white/65 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {analysisState === "relocating" ? "Searching…" : "Optimize"}
          </button>
        </div>
      </motion.div>

      {/* ── Layer list (bottom-left, floating) ─────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
        className="pointer-events-auto absolute bottom-4 left-4 z-20"
      >
        <p className="map-text font-mono text-[9px] tracking-[0.28em] text-white/22 uppercase">
          Layers
        </p>
        <ul className="mt-2 max-h-[32vh] space-y-1.5 overflow-y-auto">
          {layers.map((layer) => {
            const on = enabledLayers.has(layer.id);
            return (
              <li key={layer.id}>
                <label className="flex cursor-pointer items-center gap-2.5 group">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => onToggleLayer(layer.id)}
                    className="sr-only"
                  />
                  {/* Dot indicator */}
                  <span
                    className="h-[7px] w-[7px] shrink-0 rounded-full transition duration-200"
                    style={{
                      backgroundColor: on ? layer.color : "transparent",
                      border: `1px solid ${on ? layer.color : "rgba(255,255,255,0.15)"}`,
                      boxShadow: on ? `0 0 6px ${layer.color}88` : undefined,
                    }}
                  />
                  <span
                    className={[
                      "map-text truncate text-[11.5px] font-light transition duration-150",
                      on ? "text-white/55" : "text-white/18",
                    ].join(" ")}
                  >
                    {layer.name}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </motion.div>
    </>
  );
}
