import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { ShapeKind } from "@/lib/regrid/types";
import { Circle, Hexagon, Square, Trash2 } from "lucide-react";

interface ProjectControlPanelProps {
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

export function ProjectControlPanel({
  activeTool,
  onSelectTool,
  hasShape,
  onAnalyze,
  onFindBetterSite,
  onClear,
  analysisState,
  copilotRunning,
}: ProjectControlPanelProps) {
  const busy = analysisState === "analyzing" || analysisState === "relocating" || copilotRunning;

  return (
    <motion.aside
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="pointer-events-auto absolute top-8 left-8 z-20 w-[320px]"
    >
      <div className="glass rounded-2xl border border-white/[0.08] p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <h1 className="truncate text-base font-semibold tracking-tight">ReGrid</h1>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Demo
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Place a footprint, analyze conflicts, then optimize.
            </p>
          </div>

          <button
            type="button"
            title="Clear footprint"
            onClick={onClear}
            disabled={!hasShape || busy}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-muted-foreground transition hover:border-white/20 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="mt-4">
          <p className="text-[11px] font-medium text-foreground/90">1 · Footprint</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Choose a shape, then click the map.</p>

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
          <p className="text-[11px] font-medium text-foreground/90">2 · Evaluate</p>
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
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Tip: keep layers tight—only score what matters for your scenario.
          </p>
        </div>
      </div>
    </motion.aside>
  );
}
