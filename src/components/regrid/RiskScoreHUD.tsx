import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import type { AnalysisResult, Conflict, LayerId } from "@/lib/regrid/types";

interface RiskScoreHUDProps {
  hasShape: boolean;
  analysisState: "idle" | "analyzing" | "result" | "relocating";
  result: AnalysisResult | null;
  onHoverConflict: (id: LayerId | null) => void;
  relocateSuccess: boolean;
  compare: {
    beforeScore: number | null;
    afterScore: number | null;
    movedKm: number | null;
    headline: string | null;
  };
}

function riskTone(score: number | null): "empty" | "good" | "caution" | "bad" {
  if (score === null) return "empty";
  if (score >= 60) return "bad";
  if (score >= 30) return "caution";
  return "good";
}

function layerAccent(layerId: LayerId): string {
  if (layerId === "hifld-transmission" || layerId === "eia-grid") return "#38bdf8"; // cyan/blue
  if (layerId === "epa-ejscreen") return "#c4b5fd"; // purple
  if (layerId === "usda-wildfire") return "#fb923c"; // orange
  if (layerId === "power-plants") return "#22d3ee"; // data upload
  return "#94a3b8";
}

function severityAccent(sev: Conflict["severity"]): string {
  if (sev === "high") return "#f87171";
  if (sev === "medium") return "#fbbf24";
  return "#94a3b8";
}

function riskLabel(score: number | null): string {
  if (score === null) return "—";
  if (score >= 60) return "High";
  if (score >= 30) return "Moderate";
  return "Low";
}

export function RiskScoreHUD({
  hasShape,
  analysisState,
  result,
  onHoverConflict,
  relocateSuccess,
  compare,
}: RiskScoreHUDProps) {
  const score = result?.score ?? null;
  const tone = riskTone(score);
  const conflicts = useMemo(() => result?.conflicts?.slice(0, 3) ?? [], [result]);

  const ringColor =
    tone === "bad" ? "#f87171" : tone === "caution" ? "#fbbf24" : tone === "good" ? "#34d399" : "oklch(1 0 0 / 0.10)";

  const pct = score === null ? 0 : Math.max(0, Math.min(100, score));
  const dormant = !hasShape && analysisState === "idle" && !result;

  const nextAction =
    !hasShape && analysisState === "idle"
      ? "Place a footprint to begin analysis."
      : hasShape && analysisState === "idle" && !result
        ? "Run Analyze site to generate a risk score."
        : analysisState === "analyzing"
          ? "Computing intersections and buffers…"
          : analysisState === "relocating"
            ? "Searching nearby candidates while preserving constraints…"
            : analysisState === "result" && result
              ? tone === "bad"
                ? "Try Find better site or run Copilot with a tighter risk ceiling."
                : tone === "caution"
                  ? "Review the top drivers, then optimize if you need more margin."
                  : "Strong candidate — document assumptions and proceed to diligence."
              : "—";

  return (
    <motion.aside
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
      className="pointer-events-auto absolute right-4 top-4 z-20 w-[min(280px,calc(100vw-2rem))] sm:right-8 sm:top-8 lg:w-[280px]"
    >
      <div
        className={`glass flex max-h-[calc(100%-0.5rem)] flex-col overflow-hidden rounded-2xl border border-white/[0.08] p-4 shadow-sm transition ${
          dormant ? "opacity-70" : "opacity-100"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-foreground/90">Risk intelligence</p>
            <p className="text-[11px] text-muted-foreground">Lower is better</p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {analysisState === "analyzing"
              ? "Running"
              : analysisState === "relocating"
                ? "Optimizing"
                : result
                  ? "Updated"
                  : "—"}
          </div>
        </div>

        <div className="mt-4 flex shrink-0 items-center gap-3.5">
          <div className="relative h-16 w-16 shrink-0">
            <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
              <circle cx="32" cy="32" r="26" fill="none" stroke="oklch(1 0 0 / 0.08)" strokeWidth="6" />
              <circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke={ringColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * (2 * Math.PI * 26)} ${2 * Math.PI * 26}`}
                className="transition-[stroke,stroke-dasharray] duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-lg font-semibold tabular-nums leading-none">
                {score === null ? "—" : score}
              </div>
              <div className="text-[9px] text-muted-foreground">/100</div>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-foreground/95">{riskLabel(score)} risk</p>
              <p className="text-[10px] text-muted-foreground tabular-nums">{score === null ? "" : `score ${score}`}</p>
            </div>
            {!hasShape && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Place a project footprint to begin analysis.
              </p>
            )}
            {hasShape && analysisState === "idle" && !result && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Ready to score this footprint against active layers.
              </p>
            )}
            {analysisState === "analyzing" && (
              <div className="space-y-2">
                <p className="mt-2 text-sm font-medium text-foreground/90">Spatial scoring…</p>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ x: "-40%" }}
                    animate={{ x: "120%" }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                  />
                </div>
                <div className="space-y-1 text-[11px] text-muted-foreground">
                  <p>Scanning transmission proximity…</p>
                  <p>Checking wildfire exposure…</p>
                  <p>Intersecting equity-priority areas…</p>
                </div>
              </div>
            )}
            {analysisState === "relocating" && (
              <div className="space-y-2">
                <p className="mt-2 text-sm font-medium text-foreground/90">Searching candidates…</p>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    className="h-full bg-sky-400/70"
                    initial={{ x: "-35%" }}
                    animate={{ x: "120%" }}
                    transition={{ duration: 0.95, repeat: Infinity, ease: "linear" }}
                  />
                </div>
                <div className="space-y-1 text-[11px] text-muted-foreground">
                  <p>Scoring candidate grid…</p>
                  <p>Preserving corridor access where possible…</p>
                </div>
              </div>
            )}
            {analysisState === "result" && result && (
              <div>
                <p className="mt-2 text-sm font-medium text-foreground/90">
                  {tone === "bad" ? "High conflict pressure" : tone === "caution" ? "Manageable risk" : "Strong candidate"}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {conflicts.length ? "Top drivers (hover to highlight on map)" : "No conflicts detected on active layers."}
                </p>
              </div>
            )}

            <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Next</p>
              <p className="mt-1 text-[12px] leading-snug text-foreground/90">{nextAction}</p>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {relocateSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.25 }}
              className="mt-4 shrink-0 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-[12px] font-medium text-emerald-200"
            >
              Better site found — footprint updated.
            </motion.div>
          )}
        </AnimatePresence>

        {compare.beforeScore !== null && compare.afterScore !== null && (
          <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Comparison</p>
            <p className="mt-1 text-[12px] font-semibold text-foreground/95">
              Risk {compare.beforeScore} → {compare.afterScore}
              {compare.movedKm !== null ? (
                <span className="text-[12px] font-medium text-muted-foreground"> · moved {compare.movedKm.toFixed(1)} km</span>
              ) : null}
            </p>
            {compare.headline && <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{compare.headline}</p>}
          </div>
        )}

        {analysisState === "result" && result && conflicts.length > 0 && (
          <div className="mt-5 min-h-0 flex-1 border-t border-white/[0.06] pt-4">
            <p className="text-[11px] font-medium text-foreground/90">Top drivers</p>
            <div className="mt-2 max-h-[34vh] space-y-1.5 overflow-y-auto pr-1 sm:max-h-[38vh]">
              {conflicts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseEnter={() => onHoverConflict(c.layerId)}
                  onMouseLeave={() => onHoverConflict(null)}
                  className="flex w-full items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-left transition hover:border-white/15 hover:bg-white/[0.04]"
                >
                  <span
                    className="mt-1 h-6 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: layerAccent(c.layerId) }}
                    aria-hidden
                  />
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: severityAccent(c.severity) }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-medium leading-snug text-foreground [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden">
                      {c.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden">
                      {c.detail}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
