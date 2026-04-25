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
  onApplySuggestion?: () => void;
  canApplySuggestion?: boolean;
}

/** Rough score contribution for display (+N) — aligned with analyze.ts weighting. */
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

function headlineTier(score: number | null): { title: string; accent: "orange" | "amber" | "emerald" | "slate" } {
  if (score === null) return { title: "Awaiting score", accent: "slate" };
  if (score >= 60) return { title: "High", accent: "orange" };
  if (score >= 40) return { title: "Medium-high", accent: "orange" };
  if (score >= 30) return { title: "Moderate", accent: "amber" };
  return { title: "Low", accent: "emerald" };
}

function conflictAccent(layerId: LayerId): { line: string; title: string } {
  if (layerId === "usda-wildfire") return { line: "#fb923c", title: "#fdba74" };
  if (layerId === "epa-ejscreen") return { line: "#f472b6", title: "#fbcfe8" };
  if (layerId === "hifld-transmission" || layerId === "eia-grid") return { line: "#38bdf8", title: "#7dd3fc" };
  if (layerId === "power-plants") return { line: "#22d3ee", title: "#a5f3fc" };
  if (typeof layerId === "string" && layerId.startsWith("ext:")) return { line: "#84cc16", title: "#bef264" };
  return { line: "#94a3b8", title: "#e2e8f0" };
}

export function RiskScoreHUD({
  hasShape,
  analysisState,
  result,
  onHoverConflict,
  relocateSuccess,
  compare,
  onApplySuggestion,
  canApplySuggestion = false,
}: RiskScoreHUDProps) {
  const score = result?.score ?? null;
  const tier = headlineTier(score);
  const conflicts = useMemo(() => result?.conflicts?.slice(0, 5) ?? [], [result]);
  const activeCount = conflicts.length;

  const scoreColor =
    tier.accent === "orange" || tier.accent === "amber"
      ? "text-[#e28a5b]"
      : tier.accent === "emerald"
        ? "text-emerald-400/95"
        : "text-[#64748b]";

  const recommendation = useMemo(() => {
    if (relocateSuccess && compare.afterScore !== null && compare.beforeScore !== null) {
      return `Risk improved from ${compare.beforeScore} to ${compare.afterScore}${
        compare.movedKm != null ? ` after moving the footprint ${compare.movedKm.toFixed(1)} km.` : "."
      }`;
    }
    if (compare.afterScore !== null && compare.beforeScore !== null && compare.movedKm !== null) {
      return `Previous run: score ${compare.beforeScore} → ${compare.afterScore} · ${compare.movedKm.toFixed(1)} km shift.`;
    }
    if (analysisState === "result" && result && score !== null && score >= 30) {
      return "Try Optimize to search nearby lower-risk anchors while keeping your site size, or tighten layers in the command bar.";
    }
    if (analysisState === "result" && result && score !== null && score < 30) {
      return "Candidate looks comparatively clean on active layers — validate with real datasets before commitment.";
    }
    return null;
  }, [
    relocateSuccess,
    compare.afterScore,
    compare.beforeScore,
    compare.movedKm,
    analysisState,
    result,
    score,
  ]);

  return (
    <motion.aside
      initial={{ x: 16, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="pointer-events-auto absolute right-3 top-3 z-20 w-[min(340px,calc(100vw-1.25rem))] sm:right-5 sm:w-[312px]"
    >
      <div className="regrid-risk-panel-glow flex max-h-[calc(100vh-7.5rem)] flex-col overflow-hidden rounded-lg border border-white/[0.06] bg-[#0d1117]/95 backdrop-blur-xl">
        <div className="border-b border-white/[0.06] px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#64748b]">Siting risk score</p>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className={`text-[2.75rem] font-semibold leading-[1.05] tracking-tight tabular-nums ${scoreColor}`}>
              {score === null ? "—" : score}
            </span>
            <span className="pb-1 text-xl font-medium text-[#475569]">/100</span>
          </div>
          <p className="mt-2 text-[14px] font-medium leading-snug text-[#e2e8f0]">
            {tier.title}
            {analysisState === "result" && result ? (
              <span className="font-normal text-[#94a3b8]">
                {" "}
                · {activeCount} active conflict{activeCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {!hasShape && analysisState === "idle" && (
            <p className="text-[13px] leading-relaxed text-[#94a3b8]">
              Draw a site on the map, then run analysis to see drivers and score.
            </p>
          )}
          {hasShape && analysisState === "idle" && !result && (
            <p className="text-[13px] leading-relaxed text-[#94a3b8]">Run analysis to score this footprint.</p>
          )}
          {analysisState === "analyzing" && (
            <div className="space-y-2">
              <p className="text-[13px] font-medium text-[#e2e8f0]">Evaluating protected land overlap…</p>
              <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="h-full bg-[#60a5fa]"
                  initial={{ x: "-45%" }}
                  animate={{ x: "130%" }}
                  transition={{ duration: 1.05, repeat: Infinity, ease: "linear" }}
                />
              </div>
              <p className="text-[12px] text-[#64748b]">Transmission · wildfire · equity · grid</p>
            </div>
          )}
          {analysisState === "relocating" && (
            <div className="space-y-2">
              <p className="text-[13px] font-medium text-[#e2e8f0]">Searching lower-risk anchors…</p>
              <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="h-full bg-[#60a5fa]/85"
                  initial={{ x: "-40%" }}
                  animate={{ x: "130%" }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                />
              </div>
            </div>
          )}

          {analysisState === "result" && result && conflicts.length > 0 && (
            <ul className="space-y-3">
              {conflicts.map((c) => {
                const w = approxConflictWeight(c);
                const { line, title } = conflictAccent(c.layerId);
                const shortLabel = c.label.replace(/\s+overlap$/i, "").replace(/\s+nearby.*$/i, "");
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onMouseEnter={() => onHoverConflict(c.layerId)}
                      onMouseLeave={() => onHoverConflict(null)}
                      className="w-full text-left transition hover:opacity-95"
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-1.5 h-px w-3 shrink-0 bg-transparent" />
                        <div className="min-w-0 flex-1 border-l-2 pl-2.5" style={{ borderColor: line }}>
                          <p className="text-[13px] font-medium" style={{ color: title }}>
                            {shortLabel}
                            <span className="tabular-nums text-[#94a3b8]"> (+{w})</span>
                          </p>
                          <p className="mt-0.5 text-[12px] leading-snug text-[#94a3b8]">{c.detail}</p>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {analysisState === "result" && result && conflicts.length === 0 && (
            <p className="text-[13px] leading-relaxed text-emerald-400/90">No conflicts on active layers for this footprint.</p>
          )}
        </div>

        <AnimatePresence>
          {recommendation ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="border-t border-white/[0.06] bg-[#0a0e14]/80 px-5 py-4"
            >
              <p className="text-[12px] italic leading-relaxed text-[#94a3b8]">{recommendation}</p>
              {onApplySuggestion && canApplySuggestion ? (
                <button
                  type="button"
                  onClick={onApplySuggestion}
                  className="mt-2.5 text-[12px] font-semibold text-[#60a5fa] transition hover:text-[#93c5fd]"
                >
                  Apply suggestion →
                </button>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}
