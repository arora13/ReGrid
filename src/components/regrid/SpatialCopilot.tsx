import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AnalysisResult, DrawnShape, LayerDef, LayerId, ShapeKind } from "@/lib/regrid/types";
import { runSpatialCopilotDemo } from "@/lib/regrid/copilot";
import {
  enabledSetFromIntentFocus,
  runStructuredSpatialCopilot,
} from "@/lib/regrid/copilot-structured";
import { parseCopilotIntentFn } from "@/lib/regrid/parseCopilotIntent";
import { ArrowRight, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

const SAMPLE_PROMPTS = [
  "Lowest risk solar near Fresno, 80 acres",
  "Wind site near Pomona under 35 score",
  "Lowest risk in Central Valley, CA",
  "Battery storage near Sacramento",
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
  onCommandSubmitted?: (command: string) => void;
  showAnswerInRiskPanel?: boolean;
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
  onCommandSubmitted,
}: SpatialCopilotProps) {
  const [traceOpen, setTraceOpen] = useState(false);
  const [command, setCommand] = useState("");
  const [log, setLog] = useState<string[]>(["system · copilot_ready"]);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastAnthropicAttemptRef = useRef(0);
  const ANTHROPIC_CLIENT_COOLDOWN_MS = 3200;

  useEffect(() => {
    onCopilotRunningChange?.(running);
  }, [running, onCopilotRunningChange]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [log, traceOpen]);

  const canRun = useMemo(() => command.trim().length > 0 && !running, [command, running]);
  const append = (line: string) => setLog((prev) => [...prev.slice(-200), line]);

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
      onCommandSubmitted?.(trimmed);
      let summary: string;
      try {
        const now = Date.now();
        if (now - lastAnthropicAttemptRef.current < ANTHROPIC_CLIENT_COOLDOWN_MS) {
          append("client · llm_cooldown · fallback_regex");
          summary = await runSpatialCopilotDemo({
            command: trimmed,
            enabledLayers,
            allLayers,
            shapeKind,
            mapboxToken,
            signal: ac.signal,
            handlers: {
              onLog: append,
              onFly: flyTo,
              onShape: onApplyShape,
              onAnalysis: onApplyAnalysis,
            },
          });
        } else {
          lastAnthropicAttemptRef.current = now;
          const intentRes = await parseCopilotIntentFn({
            data: { command: trimmed },
            signal: ac.signal,
          });
          if (intentRes.ok) {
            const nextEnabled = enabledSetFromIntentFocus(
              intentRes.intent,
              allLayers,
              enabledLayers,
            );
            onApplyEnabledLayers?.(nextEnabled);
            append("llm · intent_ok");
            summary = await runStructuredSpatialCopilot({
              command: trimmed,
              intent: intentRes.intent,
              enabledLayersForRun: nextEnabled,
              allLayers,
              shapeKind,
              mapboxToken,
              signal: ac.signal,
              handlers: {
                onLog: append,
                onFly: flyTo,
                onShape: onApplyShape,
                onAnalysis: onApplyAnalysis,
              },
            });
          } else {
            const extra =
              intentRes.code === "rate_limited" && intentRes.retryAfterSec
                ? ` (retry ~${intentRes.retryAfterSec}s)`
                : "";
            append(`llm · ${intentRes.code}${extra} · fallback_regex`);
            summary = await runSpatialCopilotDemo({
              command: trimmed,
              enabledLayers,
              allLayers,
              shapeKind,
              mapboxToken,
              signal: ac.signal,
              handlers: {
                onLog: append,
                onFly: flyTo,
                onShape: onApplyShape,
                onAnalysis: onApplyAnalysis,
              },
            });
          }
        }
      } catch {
        append("llm · request_failed · fallback_regex");
        summary = await runSpatialCopilotDemo({
          command: trimmed,
          enabledLayers,
          allLayers,
          shapeKind,
          mapboxToken,
          signal: ac.signal,
          handlers: {
            onLog: append,
            onFly: flyTo,
            onShape: onApplyShape,
            onAnalysis: onApplyAnalysis,
          },
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
      {/* Gradient vignette above bar */}
      <div className="pointer-events-none h-28 bg-gradient-to-t from-black/75 to-transparent" />

      <div className="pointer-events-auto border-t border-white/[0.12] bg-[#060f1c]/96 backdrop-blur-2xl">
        {/* ── Top row: label + quick prompts ─────────────────── */}
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-2.5">
          <div className="flex shrink-0 items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-amber-400/60" strokeWidth={1.8} />
            <span className="font-mono text-[9.5px] font-semibold tracking-[0.2em] text-white/40 uppercase">
              AI Copilot
            </span>
          </div>

          <div className="h-3 w-px shrink-0 bg-white/[0.1]" />

          {/* Quick prompt chips — always visible */}
          <div className="flex flex-1 gap-1.5 overflow-x-auto scrollbar-none">
            {SAMPLE_PROMPTS.map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => {
                  setCommand(text);
                  inputRef.current?.focus();
                }}
                className="shrink-0 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] whitespace-nowrap text-white/38 transition duration-150 hover:border-white/18 hover:bg-white/[0.07] hover:text-white/70"
              >
                {text.length > 30 ? text.slice(0, 28) + "…" : text}
              </button>
            ))}
          </div>

          {/* Trace toggle */}
          <button
            type="button"
            onClick={() => setTraceOpen((v) => !v)}
            className="hidden shrink-0 items-center gap-1 text-[10px] text-white/20 transition hover:text-white/45 sm:flex"
          >
            Trace{" "}
            {traceOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {/* ── Main input ───────────────────────────────────────── */}
        <form
          className="flex items-center gap-3 px-5 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            void handleRun();
          }}
        >
          {/* Animated status dot */}
          <span className="relative flex h-[7px] w-[7px] shrink-0">
            {running && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
            )}
            <span
              className={`relative inline-flex h-[7px] w-[7px] rounded-full transition duration-300 ${
                running ? "bg-amber-400" : "bg-white/20"
              }`}
            />
          </span>

          <input
            ref={inputRef}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={running}
            placeholder={
              running
                ? "AI copilot thinking…"
                : "Describe a siting goal or ask a question — e.g. lowest-risk solar near Fresno, 80 acres"
            }
            className="min-w-0 flex-1 bg-transparent text-[13.5px] text-white/85 placeholder:text-white/28 focus:outline-none disabled:opacity-60"
          />

          <motion.button
            type="submit"
            disabled={!canRun}
            whileHover={canRun ? { scale: 1.05 } : {}}
            whileTap={canRun ? { scale: 0.95 } : {}}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition duration-150 ${
              canRun
                ? "bg-white/14 text-white shadow-[0_0_16px_rgba(255,255,255,0.08)] hover:bg-white/22"
                : "cursor-not-allowed text-white/15"
            }`}
          >
            <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
          </motion.button>
        </form>

        {/* ── Status / trace ───────────────────────────────────── */}
        <AnimatePresence initial={false}>
          {traceOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden border-t border-white/[0.06]"
            >
              <div className="max-h-24 overflow-y-auto px-5 py-2.5 font-mono text-[10px] leading-relaxed text-white/22">
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
