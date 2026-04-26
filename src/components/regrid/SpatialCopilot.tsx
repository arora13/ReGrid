import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AnalysisResult, DrawnShape, LayerDef, LayerId, ShapeKind } from "@/lib/regrid/types";
import { runSpatialCopilotDemo } from "@/lib/regrid/copilot";
import {
  enabledSetFromIntentFocus,
  runStructuredSpatialCopilot,
} from "@/lib/regrid/copilot-structured";
import { parseCopilotIntentFn } from "@/lib/regrid/parseCopilotIntent";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";

const COPILOT_TUTORIAL_DISMISS_KEY = "regrid:copilot-tutorial-dismiss";

const SAMPLE_PROMPTS: { label: string; text: string }[] = [
  { label: "Wind + city", text: "Lowest wind risk near Pomona" },
  { label: "City + acres", text: "80 acres lowest risk near Fresno" },
  { label: "Solar + region", text: "Lowest risk solar in Central Valley, risk under 35" },
  { label: "Statewide", text: "Lowest risk site in California, 50 acres" },
];

interface SpatialCopilotProps {
  allLayers: LayerDef[];
  enabledLayers: Set<LayerId>;
  mapboxToken?: string;
  onApplyEnabledLayers?: (next: Set<LayerId>) => void;
  shapeKind: ShapeKind;
  flyTo: (center: [number, number], zoom?: number) => void;
  onApplyShape: (shape: DrawnShape | null) => void;
  onApplyAnalysis: (result: AnalysisResult | null) => void;
  onCopilotRunningChange?: (running: boolean) => void;
  onCopilotAnswer?: (summary: string | null) => void;
  showAnswerInRiskPanel?: boolean; // kept for API compat, answer shown in RiskScoreHUD
  statusLine?: string;
}

export function SpatialCopilot({
  allLayers,
  enabledLayers,
  mapboxToken,
  onApplyEnabledLayers,
  shapeKind,
  flyTo,
  onApplyShape,
  onApplyAnalysis,
  onCopilotRunningChange,
  onCopilotAnswer,
  statusLine = "Describe a siting goal in natural language",
}: SpatialCopilotProps) {
  const [traceOpen, setTraceOpen] = useState(false);
  const [command, setCommand] = useState("");
  const [log, setLog] = useState<string[]>(["system · copilot_ready"]);
  const [running, setRunning] = useState(false);
  const [tutorialDismissed, setTutorialDismissed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const lastAnthropicAttemptRef = useRef(0);
  const ANTHROPIC_CLIENT_COOLDOWN_MS = 3200;

  useEffect(() => {
    try {
      if (localStorage.getItem(COPILOT_TUTORIAL_DISMISS_KEY)) setTutorialDismissed(true);
    } catch { /* private mode */ }
  }, []);

  useEffect(() => { onCopilotRunningChange?.(running); }, [running, onCopilotRunningChange]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [log, traceOpen]);

  const canRun = useMemo(() => command.trim().length > 0 && !running, [command, running]);
  const append = (line: string) => setLog((prev) => [...prev.slice(-200), line]);

  const dismissTutorial = () => {
    try { localStorage.setItem(COPILOT_TUTORIAL_DISMISS_KEY, "1"); } catch { /* private mode */ }
    setTutorialDismissed(true);
  };

  const handleRun = async () => {
    if (!canRun) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setRunning(true);
    onCopilotAnswer?.(null);
    append("run · start");
    try {
      const trimmed = command.trim();
      let summary: string;
      try {
        const now = Date.now();
        if (now - lastAnthropicAttemptRef.current < ANTHROPIC_CLIENT_COOLDOWN_MS) {
          append("client · llm_cooldown · fallback_regex");
          summary = await runSpatialCopilotDemo({
            command: trimmed, enabledLayers, allLayers, shapeKind, signal: ac.signal,
            handlers: { onLog: append, onFly: flyTo, onShape: onApplyShape, onAnalysis: onApplyAnalysis },
          });
        } else {
          lastAnthropicAttemptRef.current = now;
          const intentRes = await parseCopilotIntentFn({ data: { command: trimmed }, signal: ac.signal });
          if (intentRes.ok) {
            const nextEnabled = enabledSetFromIntentFocus(intentRes.intent, allLayers, enabledLayers);
            onApplyEnabledLayers?.(nextEnabled);
            append("llm · intent_ok");
            summary = await runStructuredSpatialCopilot({
              command: trimmed, intent: intentRes.intent, enabledLayersForRun: nextEnabled,
              allLayers, shapeKind, mapboxToken, signal: ac.signal,
              handlers: { onLog: append, onFly: flyTo, onShape: onApplyShape, onAnalysis: onApplyAnalysis },
            });
          } else {
            const extra = intentRes.code === "rate_limited" && intentRes.retryAfterSec
              ? ` (retry ~${intentRes.retryAfterSec}s)` : "";
            append(`llm · ${intentRes.code}${extra} · fallback_regex`);
            summary = await runSpatialCopilotDemo({
              command: trimmed, enabledLayers, allLayers, shapeKind, signal: ac.signal,
              handlers: { onLog: append, onFly: flyTo, onShape: onApplyShape, onAnalysis: onApplyAnalysis },
            });
          }
        }
      } catch {
        append("llm · request_failed · fallback_regex");
        summary = await runSpatialCopilotDemo({
          command: trimmed, enabledLayers, allLayers, shapeKind, signal: ac.signal,
          handlers: { onLog: append, onFly: flyTo, onShape: onApplyShape, onAnalysis: onApplyAnalysis },
        });
      }
      append("run · complete");
      onCopilotAnswer?.(summary);
    } catch (e) {
      const err = e as { name?: string };
      if (err?.name === "AbortError") {
        append("run · aborted");
        onCopilotAnswer?.(null);
      } else {
        append("run · error");
        console.error(e);
        onCopilotAnswer?.("Copilot crashed — try a shorter prompt.");
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
      {/* Bottom gradient fade */}
      <div className="pointer-events-none h-20 bg-gradient-to-t from-black/60 to-transparent" />

      <div className="pointer-events-auto border-t border-white/[0.14] bg-[#06101e]/92 backdrop-blur-xl">
        {/* ── Sample prompts (shown until dismissed) ─────────── */}
        <AnimatePresence>
          {!tutorialDismissed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden border-b border-white/[0.06]"
            >
              <div className="flex items-center gap-3 px-6 py-2.5">
                <span className="map-text font-mono text-[9px] tracking-[0.25em] text-white/20 uppercase">
                  Try
                </span>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_PROMPTS.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => setCommand(s.text)}
                      className="map-text rounded px-2.5 py-1 text-[11px] text-white/30 ring-1 ring-white/[0.08] transition hover:bg-white/5 hover:text-white/60"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={dismissTutorial}
                  className="ml-auto shrink-0 text-[10px] text-white/18 transition hover:text-white/40"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Status line ──────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 px-6 py-2">
          <span className="relative flex h-[5px] w-[5px] shrink-0">
            {running && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/50 opacity-70" />
            )}
            <span
              className={`relative inline-flex h-[5px] w-[5px] rounded-full transition duration-300 ${
                running ? "bg-white/60" : "bg-white/18"
              }`}
            />
          </span>
          <p className="text-[11px] text-white/45">{statusLine}</p>
        </div>

        {/* ── Input row ────────────────────────────────────────── */}
        <form
          className="flex items-center gap-3 border-t border-white/[0.05] px-6 py-3"
          onSubmit={(e) => { e.preventDefault(); void handleRun(); }}
        >
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={running}
            placeholder="Describe a siting goal — e.g. lowest risk near Pomona, 80 acres"
            className="min-w-0 flex-1 bg-transparent text-[13px] font-light text-white/85 placeholder:text-white/32 focus:outline-none disabled:opacity-50"
          />

          <button
            type="button"
            onClick={() => setTraceOpen((v) => !v)}
            className="hidden shrink-0 items-center gap-1 text-[10px] text-white/18 transition hover:text-white/40 sm:flex"
          >
            Trace
            {traceOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          <button
            type="submit"
            disabled={!canRun}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition duration-150 ${
              canRun
                ? "bg-white/12 text-white/80 hover:bg-white/18 hover:text-white"
                : "text-white/15"
            } disabled:cursor-not-allowed`}
          >
            <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
          </button>
        </form>

        {/* ── Trace log ────────────────────────────────────────── */}
        <AnimatePresence initial={false}>
          {traceOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden border-t border-white/[0.05]"
            >
              <div className="max-h-24 overflow-y-auto px-6 py-2.5 font-mono text-[10px] leading-relaxed text-white/20">
                {log.map((line, idx) => (
                  <div key={`${idx}-${line}`}>{line}</div>
                ))}
                <div ref={endRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
