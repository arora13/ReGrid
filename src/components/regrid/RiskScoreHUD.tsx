import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import type { AnalysisResult, Conflict, LayerId } from "@/lib/regrid/types";

interface RiskScoreHUDProps {
  hasShape: boolean;
  analysisState: "idle" | "analyzing" | "result" | "relocating";
  result: AnalysisResult | null;
  copilotAnswer?: string | null;
  onHoverConflict: (id: LayerId | null) => void;
  relocateSuccess: boolean;
  compare: {
    beforeScore: number | null;
    afterScore: number | null;
    movedKm: number | null;
    headline: string | null;
  };
  onApplySuggestion?: () => void;
  canApplySuggestion?: boolean;
}

function approxConflictWeight(c: Conflict): number {
  const isOverlap = c.detail.includes("overlap");
  if (isOverlap) {
    if (c.layerId === "usda-wildfire") return 32;
    if (c.layerId === "epa-ejscreen") return 28;
    if (c.layerId === "power-plants") return 14;
    if (typeof c.layerId === "string" && c.layerId.startsWith("ext:")) return 24;
    return 18;
  }
  if (c.layerId === "hifld-transmission") return 6;
  if (c.layerId === "power-plants") return 8;
  if (typeof c.layerId === "string" && c.layerId.startsWith("ext:")) return 9;
  return 10;
}

function scoreMeta(score: number | null): {
  label: string;
  color: string;
  glow: string;
} {
  if (score === null) return { label: "—", color: "rgba(255,255,255,0.12)", glow: "transparent" };
  if (score >= 60) return { label: "High", color: "#fb923c", glow: "rgba(251,146,60,0.35)" };
  if (score >= 40) return { label: "Med-high", color: "#fbbf24", glow: "rgba(251,191,36,0.35)" };
  if (score >= 30) return { label: "Moderate", color: "#fde68a", glow: "rgba(253,230,138,0.3)" };
  return { label: "Low", color: "#6ee7b7", glow: "rgba(110,231,183,0.3)" };
}

export function RiskScoreHUD({
  hasShape,
  analysisState,
  result,
  copilotAnswer = null,
  onHoverConflict,
  relocateSuccess,
  compare,
  onApplySuggestion,
  canApplySuggestion = false,
}: RiskScoreHUDProps) {
  const score = result?.score ?? null;
  const meta = scoreMeta(score);
  const conflicts = useMemo(() => result?.conflicts ?? [], [result]);
  const activeCount = result?.conflicts?.length ?? 0;
  const busy = analysisState === "analyzing" || analysisState === "relocating";

  const recommendation = useMemo(() => {
    if (relocateSuccess && compare.afterScore !== null && compare.beforeScore !== null) {
      return `Risk improved from ${compare.beforeScore} to ${compare.afterScore}${
        compare.movedKm != null ? `, moving the footprint ${compare.movedKm.toFixed(1)} km.` : "."
      }`;
    }
    if (compare.afterScore !== null && compare.beforeScore !== null && compare.movedKm !== null) {
      return `Previous: ${compare.beforeScore} → ${compare.afterScore} · ${compare.movedKm.toFixed(1)} km shift.`;
    }
    if (analysisState === "result" && score !== null && score >= 30) {
      return "A relocation may reduce the primary conflict driver. Try Optimize.";
    }
    if (analysisState === "result" && score !== null && score < 30) {
      return "Candidate looks clean on active layers — validate with real datasets.";
    }
    return null;
  }, [relocateSuccess, compare, analysisState, score]);

  return (
    <motion.aside
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="pointer-events-auto absolute right-0 top-0 bottom-0 z-20 flex min-h-0 w-[min(340px,calc(100vw-3rem))] flex-col pr-6 sm:pr-8"
    >
      {/* Top gradient fade */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-full bg-gradient-to-l from-black/60 via-black/20 to-transparent" />

      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
        <div className="relative flex min-h-full flex-col items-end justify-center py-10 pb-40 text-right">
        {/* ── Score section ─────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {busy ? (
            <motion.div
              key="busy"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-right"
            >
              <p className="map-text font-mono text-[10px] tracking-[0.3em] text-white/25 uppercase">
                {analysisState === "analyzing" ? "Evaluating" : "Optimizing"}
              </p>
              <div className="mt-3 flex items-end justify-end gap-2">
                <div
                  className="h-[80px] w-[80px] rounded-full border border-white/10 border-t-white/40"
                  style={{ animation: "spin 1.4s linear infinite" }}
                />
              </div>
              <p className="map-text mt-3 font-mono text-[10px] tracking-[0.2em] text-white/20 uppercase">
                {analysisState === "analyzing"
                  ? "Transmission · wildfire · equity"
                  : "30 km grid scan"}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={`score-${score}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <p className="map-text font-mono text-[10px] tracking-[0.3em] text-white/25 uppercase">
                Siting Risk
              </p>

              {/* Giant score */}
              <div className="mt-1 flex items-end justify-end gap-2 leading-none">
                <motion.span
                  key={score}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="map-text-strong font-serif tabular-nums"
                  style={{
                    fontSize: "clamp(72px, 9vw, 112px)",
                    lineHeight: 0.88,
                    color: meta.color,
                    textShadow: `0 0 80px ${meta.glow}, 0 2px 8px rgba(0,0,0,1)`,
                  }}
                >
                  {score ?? "—"}
                </motion.span>
                <span
                  className="map-text mb-2 text-[17px] font-light"
                  style={{ color: "rgba(255,255,255,0.2)" }}
                >
                  / 100
                </span>
              </div>

              {/* Tier + count */}
              {analysisState === "result" && result ? (
                <p
                  className="map-text mt-2 text-[12px] font-light"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  {meta.label} &nbsp;·&nbsp; {activeCount} active conflict
                  {activeCount === 1 ? "" : "s"}
                </p>
              ) : !hasShape ? (
                <p className="map-text mt-2 text-[12px] font-light text-white/20">
                  Draw a site on the map to begin.
                </p>
              ) : analysisState === "idle" ? (
                <p className="map-text mt-2 text-[12px] font-light text-white/20">
                  Run analysis to score this footprint.
                </p>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Thin divider ──────────────────────────────────── */}
        {(analysisState === "result" || copilotAnswer) && (
          <div className="my-4 h-px bg-white/[0.09]" />
        )}

        {/* ── Copilot answer ────────────────────────────────── */}
        {copilotAnswer && (
          <div className="mb-4">
            <p className="map-text font-mono text-[9px] tracking-[0.3em] text-white/20 uppercase">
              Copilot reply
            </p>
            <p className="map-text mt-2 text-[12px] italic leading-relaxed text-white/50">
              {copilotAnswer}
            </p>
            <div className="mt-3 h-px bg-white/[0.07]" />
          </div>
        )}

        {/* ── Conflict list ─────────────────────────────────── */}
        <AnimatePresence>
          {analysisState === "result" && result && conflicts.length > 0 && (
            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {conflicts.map((c, i) => {
                const w = approxConflictWeight(c);
                const label = c.label
                  .replace(/\s+overlap$/i, "")
                  .replace(/\s+nearby.*$/i, "");
                return (
                  <motion.li
                    key={c.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.35 }}
                  >
                    <button
                      type="button"
                      onMouseEnter={() => onHoverConflict(c.layerId)}
                      onMouseLeave={() => onHoverConflict(null)}
                      className="group w-full text-right"
                    >
                      <div className="flex items-baseline justify-end gap-2">
                        <span className="map-text text-[13px] font-semibold text-white/65 transition group-hover:text-white/90">
                          {label}
                        </span>
                        <span
                          className="map-text shrink-0 font-mono text-[11px] font-semibold tabular-nums"
                          style={{ color: meta.color, opacity: 0.75 }}
                        >
                          +{w}
                        </span>
                      </div>
                      <p className="map-text text-[11px] leading-snug text-white/28">
                        {c.detail}
                      </p>
                    </button>
                  </motion.li>
                );
              })}
            </motion.ul>
          )}

          {analysisState === "result" && result && conflicts.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="map-text text-[12px] text-white/40"
            >
              No conflicts on active layers.
            </motion.p>
          )}
        </AnimatePresence>

        {/* ── Recommendation ────────────────────────────────── */}
        <AnimatePresence>
          {recommendation && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-5"
            >
              <div className="h-px bg-white/[0.07]" />
              <p className="map-text mt-3 font-mono text-[9px] tracking-[0.3em] text-white/20 uppercase">
                Recommendation
              </p>
              <p className="map-text mt-1.5 text-[12px] italic leading-relaxed text-white/38">
                {recommendation}
              </p>
              {onApplySuggestion && canApplySuggestion && (
                <button
                  type="button"
                  onClick={onApplySuggestion}
                  className="map-text mt-2 text-[12px] font-medium text-white/40 transition hover:text-white/70"
                >
                  Apply suggestion →
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}
