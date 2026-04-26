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

function headlineTier(score: number | null): {
  label: string;
  accent: "orange" | "amber" | "emerald" | "slate";
  fillColor: string;
  glowColor: string;
} {
  if (score === null) return { label: "—", accent: "slate", fillColor: "#1e2a3a", glowColor: "transparent" };
  if (score >= 60)
    return { label: "High Risk", accent: "orange", fillColor: "#f97316", glowColor: "#f9731640" };
  if (score >= 40)
    return { label: "Med-High", accent: "orange", fillColor: "#fb923c", glowColor: "#fb923c40" };
  if (score >= 30)
    return { label: "Moderate", accent: "amber", fillColor: "#fbbf24", glowColor: "#fbbf2440" };
  return { label: "Low Risk", accent: "emerald", fillColor: "#34d399", glowColor: "#34d39940" };
}

function conflictAccent(layerId: LayerId): { line: string; title: string } {
  if (layerId === "usda-wildfire") return { line: "#fb923c", title: "#fdba74" };
  if (layerId === "epa-ejscreen") return { line: "#f472b6", title: "#fbcfe8" };
  if (layerId === "hifld-transmission" || layerId === "eia-grid")
    return { line: "#38bdf8", title: "#7dd3fc" };
  if (layerId === "power-plants") return { line: "#22d3ee", title: "#a5f3fc" };
  if (typeof layerId === "string" && layerId.startsWith("ext:"))
    return { line: "#84cc16", title: "#bef264" };
  return { line: "#94a3b8", title: "#e2e8f0" };
}

// ─── Score gauge ────────────────────────────────────────────────────────────

function ScoreGauge({
  score,
  tier,
  busy,
}: {
  score: number | null;
  tier: ReturnType<typeof headlineTier>;
  busy: boolean;
}) {
  const r = 44;
  const cx = 54;
  const cy = 54;
  const circumference = 2 * Math.PI * r; // ~276.5
  const arcFraction = 0.75; // 270° of 360°
  const arcLength = circumference * arcFraction; // ~207.3
  const filledLength = score !== null ? (score / 100) * arcLength : 0;

  return (
    <div className="relative h-[108px] w-[108px] shrink-0">
      <svg width="108" height="108" viewBox="0 0 108 108" className="absolute inset-0">
        {/* Outer glow ring (visible when score exists) */}
        {score !== null && !busy && (
          <circle
            cx={cx}
            cy={cy}
            r={r + 5}
            fill="none"
            stroke={tier.fillColor}
            strokeWidth="1"
            strokeOpacity="0.12"
          />
        )}

        {/* Track arc */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#1a2535"
          strokeWidth="7"
          strokeDasharray={`${arcLength} ${circumference - arcLength}`}
          transform={`rotate(135, ${cx}, ${cy})`}
          strokeLinecap="round"
        />

        {/* Spinning ring when busy */}
        {busy && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#0e7490"
            strokeWidth="7"
            strokeDasharray={`${arcLength * 0.25} ${circumference - arcLength * 0.25}`}
            transform={`rotate(135, ${cx}, ${cy})`}
            strokeLinecap="round"
            style={{ animation: "spin 1.2s linear infinite", transformOrigin: `${cx}px ${cy}px` }}
          />
        )}

        {/* Fill arc — animated via dashoffset */}
        {score !== null && !busy && (
          <motion.circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={tier.fillColor}
            strokeWidth="7"
            strokeDasharray={circumference}
            transform={`rotate(135, ${cx}, ${cy})`}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 5px ${tier.glowColor})`,
            }}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - filledLength }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
        )}
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {busy ? (
            <motion.div
              key="busy"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-1"
            >
              <div
                className="h-4 w-4 rounded-full border-2 border-cyan-500/30 border-t-cyan-400"
                style={{ animation: "spin 0.9s linear infinite" }}
              />
            </motion.div>
          ) : (
            <motion.div
              key={`score-${score}`}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center"
            >
              <span
                className="text-[1.85rem] font-bold leading-none tabular-nums"
                style={{ color: score !== null ? tier.fillColor : "#2a3a50" }}
              >
                {score ?? "—"}
              </span>
              <span className="mt-0.5 text-[9px] font-medium tracking-wide text-slate-600">
                /100
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Main HUD ───────────────────────────────────────────────────────────────

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
  const tier = headlineTier(score);
  const conflicts = useMemo(() => result?.conflicts?.slice(0, 5) ?? [], [result]);
  const activeCount = conflicts.length;
  const busy = analysisState === "analyzing" || analysisState === "relocating";

  const tierBadgeStyle = {
    orange: "border-orange-400/25 bg-orange-500/10 text-orange-300",
    amber: "border-amber-400/25 bg-amber-500/10 text-amber-300",
    emerald: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
    slate: "border-slate-600/25 bg-slate-500/8 text-slate-500",
  }[tier.accent];

  const recommendation = useMemo(() => {
    if (relocateSuccess && compare.afterScore !== null && compare.beforeScore !== null) {
      return `Risk improved from ${compare.beforeScore} → ${compare.afterScore}${
        compare.movedKm != null ? ` · moved ${compare.movedKm.toFixed(1)} km.` : "."
      }`;
    }
    if (compare.afterScore !== null && compare.beforeScore !== null && compare.movedKm !== null) {
      return `Previous run: ${compare.beforeScore} → ${compare.afterScore} · ${compare.movedKm.toFixed(1)} km shift.`;
    }
    if (analysisState === "result" && result && score !== null && score >= 30) {
      return "Try Optimize to search nearby lower-risk anchors, or tighten layers in the command bar.";
    }
    if (analysisState === "result" && result && score !== null && score < 30) {
      return "Candidate looks comparatively clean — validate with real datasets before commitment.";
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
      className="pointer-events-auto absolute right-3 top-3 z-20 w-[min(340px,calc(100vw-1.25rem))] sm:right-5 sm:w-[316px]"
    >
      <div className="regrid-risk-panel-glow regrid-premium-panel relative flex max-h-[calc(100vh-7.5rem)] flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#060c14]/90 backdrop-blur-xl">
        {/* Top glow line */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
          <div className="absolute -right-6 -top-8 h-28 w-32 rounded-full bg-cyan-400/10 blur-2xl" />
        </div>

        {/* ── Header: gauge + tier info ─────────────────────────── */}
        <div className="relative border-b border-white/[0.06] px-4 py-4">
          <div className="flex items-center gap-4">
            <ScoreGauge score={score} tier={tier} busy={busy} />

            <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.22em] text-cyan-100/45">
                Siting Score
              </p>

              <AnimatePresence mode="wait">
                {busy ? (
                  <motion.div
                    key="busy-status"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-2"
                  >
                    <p className="text-[12px] font-medium text-slate-400">
                      {analysisState === "analyzing"
                        ? "Evaluating conflicts…"
                        : "Finding better site…"}
                    </p>
                    <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                        initial={{ x: "-55%" }}
                        animate={{ x: "130%" }}
                        transition={{ duration: 1.0, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                    <p className="text-[10px] text-cyan-100/30">
                      {analysisState === "analyzing"
                        ? "Transmission · wildfire · equity"
                        : "30 km grid scan in progress"}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`result-${score}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-1.5"
                  >
                    {/* Tier badge */}
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${tierBadgeStyle}`}
                    >
                      {tier.label}
                    </span>

                    {analysisState === "result" && result ? (
                      <p className="text-[10.5px] text-slate-500">
                        {activeCount} conflict{activeCount === 1 ? "" : "s"} detected
                      </p>
                    ) : null}

                    {!hasShape && analysisState === "idle" ? (
                      <p className="text-[10.5px] leading-relaxed text-slate-600">
                        Draw a site on the map to begin.
                      </p>
                    ) : null}

                    {hasShape && analysisState === "idle" && !result ? (
                      <p className="text-[10.5px] leading-relaxed text-slate-600">
                        Run analysis to score this footprint.
                      </p>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── Copilot answer ────────────────────────────────────── */}
        {copilotAnswer ? (
          <div className="border-b border-cyan-300/15 bg-gradient-to-r from-cyan-500/10 to-blue-500/6 px-4 py-3">
            <p className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-cyan-300/80">
              Copilot reply
            </p>
            <p className="text-[12.5px] font-medium leading-snug text-[#e8f4ff]">{copilotAnswer}</p>
          </div>
        ) : null}

        {/* ── Conflict list ─────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {analysisState === "result" && result && conflicts.length > 0 && (
            <ul className="space-y-4">
              {conflicts.map((c, index) => {
                const w = approxConflictWeight(c);
                const { line, title } = conflictAccent(c.layerId);
                const shortLabel = c.label
                  .replace(/\s+overlap$/i, "")
                  .replace(/\s+nearby.*$/i, "");
                const barPct = Math.min((w / 35) * 100, 100);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onMouseEnter={() => onHoverConflict(c.layerId)}
                      onMouseLeave={() => onHoverConflict(null)}
                      className="group w-full text-left"
                    >
                      <div
                        className="rounded-r-md border-l-2 pl-3 transition-all duration-150 group-hover:brightness-110"
                        style={{ borderColor: line }}
                      >
                        {/* Label + weight */}
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className="text-[12px] font-medium leading-snug"
                            style={{ color: title }}
                          >
                            {shortLabel}
                          </p>
                          <span
                            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                            style={{
                              color: line,
                              backgroundColor: `${line}18`,
                              border: `1px solid ${line}30`,
                            }}
                          >
                            +{w}
                          </span>
                        </div>

                        {/* Weight bar */}
                        <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-white/[0.05]">
                          <motion.div
                            className="h-full rounded-full"
                            style={{
                              backgroundColor: line,
                              boxShadow: `0 0 6px ${line}66`,
                            }}
                            initial={{ width: 0 }}
                            animate={{ width: `${barPct}%` }}
                            transition={{
                              duration: 0.65,
                              delay: index * 0.08,
                              ease: "easeOut",
                            }}
                          />
                        </div>

                        {/* Detail */}
                        <p className="mt-1 text-[11px] leading-snug text-slate-500">{c.detail}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {analysisState === "result" && result && conflicts.length === 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/8 px-4 py-3">
              <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
              <p className="text-[12.5px] text-emerald-300/90">
                No conflicts on active layers for this footprint.
              </p>
            </div>
          )}
        </div>

        {/* ── Recommendation footer ──────────────────────────────── */}
        <AnimatePresence>
          {recommendation ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="border-t border-white/[0.06] bg-[#040a11]/70 px-4 py-3"
            >
              <p className="text-[11.5px] italic leading-relaxed text-slate-500">
                {recommendation}
              </p>
              {onApplySuggestion && canApplySuggestion ? (
                <button
                  type="button"
                  onClick={onApplySuggestion}
                  className="mt-2 text-[11.5px] font-semibold text-[#60a5fa] transition hover:text-[#93c5fd]"
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
