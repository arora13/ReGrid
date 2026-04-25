import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import type { AnalysisResult, Conflict, LayerId } from "@/lib/regrid/types";

interface RiskPanelProps {
  state: "idle" | "analyzing" | "result" | "relocating";
  result: AnalysisResult | null;
  onAnalyze: () => void;
  onRelocate: () => void;
  onHoverConflict: (id: LayerId | null) => void;
  hasShape: boolean;
}

export function RiskPanel({
  state,
  result,
  onAnalyze,
  onRelocate,
  onHoverConflict,
  hasShape,
}: RiskPanelProps) {
  return (
    <motion.aside
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="glass-strong pointer-events-auto absolute top-28 right-8 bottom-72 z-20 flex w-[340px] flex-col rounded-2xl"
    >
      <div className="border-b border-white/[0.06] px-4 py-3">
        <p className="font-mono text-[10px] tracking-[0.25em] text-primary/80 uppercase">Analysis</p>
        <h2 className="mt-0.5 text-base font-semibold tracking-tight">Conflict risk</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {state === "idle" && (
            <IdleView key="idle" hasShape={hasShape} onAnalyze={onAnalyze} />
          )}
          {state === "analyzing" && <AnalyzingView key="analyzing" />}
          {state === "result" && result && (
            <ResultView
              key="result"
              result={result}
              onRelocate={onRelocate}
              onHoverConflict={onHoverConflict}
            />
          )}
          {state === "relocating" && <RelocatingView key="reloc" />}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}

function IdleView({ hasShape, onAnalyze }: { hasShape: boolean; onAnalyze: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full flex-col items-center justify-center p-7 text-center"
    >
      <div className="relative mb-5 h-24 w-24 rounded-full border border-primary/20">
        <div className="absolute inset-2 rounded-full border border-primary/25 animate-spin-slow" />
        <div className="absolute inset-5 rounded-full border border-dashed border-primary/35" />
        <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] tracking-widest text-primary/80 uppercase">
          {hasShape ? "Ready" : "Awaiting"}
        </div>
      </div>
      <p className="max-w-[240px] text-sm leading-relaxed text-muted-foreground">
        {hasShape ? "Analyze this footprint against the active layers." : "Place a footprint on the map to begin."}
      </p>
      <button
        onClick={onAnalyze}
        disabled={!hasShape}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-primary/45 bg-primary/12 px-5 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40 enabled:glow-emerald"
      >
        <span className="h-2 w-2 rounded-full bg-primary" />
        Analyze Site
      </button>
    </motion.div>
  );
}

function AnalyzingView() {
  const [step, setStep] = useState(0);
  const steps = [
    "Loading federal vector tiles…",
    "Buffering footprint geometry…",
    "Computing spatial intersections…",
    "Cross-referencing EJScreen tracts…",
    "Scoring weighted risk index…",
  ];
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), 380);
    return () => clearInterval(t);
  }, [steps.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex h-full flex-col items-center justify-center overflow-hidden p-8"
    >
      <div className="pointer-events-none absolute inset-0 grid-overlay opacity-40" />
      <div
        className="pointer-events-none absolute inset-x-0 h-24 animate-scan"
        style={{
          background:
            "linear-gradient(180deg, transparent, oklch(0.78 0.22 152 / 0.35), transparent)",
        }}
      />

      <div className="relative mb-8 h-40 w-40">
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin-slow" />
        <div
          className="absolute inset-3 rounded-full border-r-2 border-primary/60"
          style={{ animation: "spin-slow 3s linear infinite reverse" }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-mono text-[10px] tracking-widest text-primary uppercase">
            Computing
          </div>
          <div className="mt-1 text-2xl font-semibold text-glow">{Math.min((step + 1) * 20, 100)}%</div>
        </div>
      </div>

      <div className="relative z-10 w-full space-y-1.5 font-mono text-[11px]">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`flex items-center gap-2 transition-opacity ${
              i <= step ? "opacity-100" : "opacity-30"
            }`}
          >
            <span className={i < step ? "text-primary" : i === step ? "text-primary animate-flicker" : "text-muted-foreground"}>
              {i < step ? "✓" : i === step ? "▸" : "·"}
            </span>
            <span className={i <= step ? "text-foreground/90" : "text-muted-foreground"}>{s}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function RelocatingView() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full flex-col items-center justify-center p-8 text-center"
    >
      <div className="relative mb-6 h-32 w-32">
        <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-spin-slow" />
        <div
          className="absolute inset-4 rounded-full border-2 border-dashed border-primary"
          style={{ animation: "spin-slow 2s linear infinite reverse" }}
        />
        <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] tracking-widest text-primary uppercase">
          AI · Search
        </div>
      </div>
      <p className="font-mono text-xs tracking-wider text-primary uppercase animate-flicker">
        Grid-search optimizer running
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Evaluating candidate sites within 30 km radius…
      </p>
    </motion.div>
  );
}

function ResultView({
  result,
  onRelocate,
  onHoverConflict,
}: {
  result: AnalysisResult;
  onRelocate: () => void;
  onHoverConflict: (id: LayerId | null) => void;
}) {
  const tone = result.score >= 60 ? "danger" : result.score >= 30 ? "warn" : "good";
  const color = tone === "danger" ? "#f87171" : tone === "warn" ? "#fbbf24" : "#34d399";
  const glowClass = tone === "danger" ? "glow-red" : tone === "warn" ? "glow-amber" : "glow-emerald";
  const label = tone === "danger" ? "HIGH RISK" : tone === "warn" ? "MODERATE" : "OPTIMAL";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full flex-col"
    >
      <div className="flex flex-col items-center px-6 pt-6 pb-4">
        <RiskDial score={result.score} color={color} glowClass={glowClass} />
        <div
          className="mt-4 rounded-full border px-3 py-1 font-mono text-[10px] tracking-[0.3em] uppercase"
          style={{ borderColor: `${color}55`, color }}
        >
          {label}
        </div>
      </div>

      <div className="border-t border-white/[0.06] px-5 py-4">
        <p className="mb-3 font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
          Detected Conflicts · {result.conflicts.length}
        </p>
        <div className="space-y-2">
          {result.conflicts.length === 0 && (
            <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-3 text-sm text-primary">
              ✓ No spatial conflicts detected across active layers.
            </div>
          )}
          {result.conflicts.map((c) => (
            <ConflictRow
              key={c.id}
              conflict={c}
              onHover={onHoverConflict}
            />
          ))}
        </div>
      </div>

      <div className="mt-auto border-t border-white/[0.06] p-5">
        <button
          onClick={onRelocate}
          className="group flex w-full items-center justify-center gap-2 rounded-xl border border-primary/50 bg-gradient-to-r from-primary/15 to-primary/25 px-4 py-3 text-sm font-semibold text-primary transition-all hover:from-primary/25 hover:to-primary/40 glow-emerald"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          AI · Auto-Relocate
        </button>
        <p className="mt-2 text-center font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
          Optimizer searches 30 km grid for lowest-risk site
        </p>
      </div>
    </motion.div>
  );
}

function RiskDial({ score, color, glowClass }: { score: number; color: string; glowClass: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const dur = 1100;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * score));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - display / 100);

  return (
    <div className={`relative h-48 w-48 ${glowClass} rounded-full`}>
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <circle cx="100" cy="100" r={radius} fill="none" stroke="oklch(1 0 0 / 0.06)" strokeWidth="10" />
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke 0.4s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
          Risk Score
        </div>
        <div
          className="mt-1 text-6xl font-bold tracking-tighter tabular-nums"
          style={{ color, textShadow: `0 0 24px ${color}88` }}
        >
          {display}
        </div>
        <div className="mt-1 font-mono text-[10px] tracking-widest text-muted-foreground">/ 100</div>
      </div>
    </div>
  );
}

function ConflictRow({
  conflict,
  onHover,
}: {
  conflict: Conflict;
  onHover: (id: LayerId | null) => void;
}) {
  const sev =
    conflict.severity === "high"
      ? { color: "#f87171", label: "HIGH" }
      : conflict.severity === "medium"
        ? { color: "#fbbf24", label: "MED" }
        : { color: "#60a5fa", label: "LOW" };

  return (
    <div
      onMouseEnter={() => onHover(conflict.layerId)}
      onMouseLeave={() => onHover(null)}
      className="group flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 transition-all hover:border-white/15 hover:bg-white/[0.05]"
    >
      <div
        className="mt-1 h-8 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: sev.color, boxShadow: `0 0 10px ${sev.color}` }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{conflict.label}</p>
          <span
            className="shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[9px] tracking-wider"
            style={{ color: sev.color, backgroundColor: `${sev.color}15` }}
          >
            {sev.label}
          </span>
        </div>
        <p className="mt-1 font-mono text-[10px] tracking-wide text-muted-foreground">{conflict.detail}</p>
      </div>
    </div>
  );
}
