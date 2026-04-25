import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AnalysisResult, DrawnShape, LayerDef, LayerId, ShapeKind } from "@/lib/regrid/types";
import { runSpatialCopilotDemo } from "@/lib/regrid/copilot";
import {
  enabledSetFromIntentFocus,
  runStructuredSpatialCopilot,
} from "@/lib/regrid/copilot-structured";
import { parseCopilotIntentFn } from "@/lib/regrid/parseCopilotIntent";
import { ChevronDown, ChevronUp, Send } from "lucide-react";

const COPILOT_TUTORIAL_DISMISS_KEY = "regrid:copilot-tutorial-dismiss";

const SAMPLE_PROMPTS: { label: string; text: string }[] = [
  { label: "Wind wording + city", text: "Lowest wind risk near Pomona" },
  { label: "City + acres", text: "80 acres lowest risk near Fresno" },
  { label: "Solar + region", text: "Lowest risk solar site in Central Valley, CA, risk under 35" },
  { label: "Statewide", text: "Lowest risk site in California, 50 acres" },
];

interface SpatialCopilotProps {
  allLayers: LayerDef[];
  enabledLayers: Set<LayerId>;
  /** Used for forward geocode when the LLM returns a place not in the built-in hint list. */
  mapboxToken?: string;
  /** When structured intent narrows or expands layers, sync parent state before scoring. */
  onApplyEnabledLayers?: (next: Set<LayerId>) => void;
  shapeKind: ShapeKind;
  flyTo: (center: [number, number], zoom?: number) => void;
  onApplyShape: (shape: DrawnShape | null) => void;
  onApplyAnalysis: (result: AnalysisResult | null) => void;
  onCopilotRunningChange?: (running: boolean) => void;
  /** Lifts the final summary to the parent (e.g. Siting risk panel). */
  onCopilotAnswer?: (summary: string | null) => void;
  /** When true, remind user the full reply is next to the score (top right). */
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
  showAnswerInRiskPanel = false,
  statusLine = "Describe a siting goal in natural language",
}: SpatialCopilotProps) {
  const [traceOpen, setTraceOpen] = useState(false);
  const [command, setCommand] = useState("");
  const [log, setLog] = useState<string[]>(["system · copilot_ready"]);
  const [running, setRunning] = useState(false);
  const [tutorialDismissed, setTutorialDismissed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(COPILOT_TUTORIAL_DISMISS_KEY)) setTutorialDismissed(true);
    } catch {
      /* private mode — keep tutorial visible */
    }
  }, []);

  useEffect(() => {
    onCopilotRunningChange?.(running);
  }, [running, onCopilotRunningChange]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [log, traceOpen]);

  const canRun = useMemo(() => command.trim().length > 0 && !running, [command, running]);
  const append = (line: string) => setLog((prev) => [...prev.slice(-200), line]);

  const dismissTutorial = () => {
    try {
      localStorage.setItem(COPILOT_TUTORIAL_DISMISS_KEY, "1");
    } catch {
      /* private mode */
    }
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
        const intentRes = await parseCopilotIntentFn({
          data: { command: trimmed },
          signal: ac.signal,
        });
        if (intentRes.ok) {
          const nextEnabled = enabledSetFromIntentFocus(intentRes.intent, allLayers, enabledLayers);
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
          append(`llm · ${intentRes.code} · fallback_regex`);
          summary = await runSpatialCopilotDemo({
            command: trimmed,
            enabledLayers,
            allLayers,
            shapeKind,
            signal: ac.signal,
            handlers: {
              onLog: append,
              onFly: flyTo,
              onShape: onApplyShape,
              onAnalysis: onApplyAnalysis,
            },
          });
        }
      } catch {
        append("llm · request_failed · fallback_regex");
        summary = await runSpatialCopilotDemo({
          command: trimmed,
          enabledLayers,
          allLayers,
          shapeKind,
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
        onCopilotAnswer?.(
          "Direct answer: the copilot crashed before finishing. Open Trace for details, or try a shorter prompt (e.g. “lowest risk near Pomona”).",
        );
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-4 pb-4 pt-8 sm:px-6">
      <div className="pointer-events-auto mx-auto max-w-4xl">
        {!tutorialDismissed ? (
          <div className="mb-3 rounded-xl border border-sky-400/20 bg-[#0a0e14]/95 px-4 py-3 shadow-lg backdrop-blur-xl">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7dd3fc]">
                Getting started
              </p>
              <button
                type="button"
                onClick={dismissTutorial}
                className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium text-[#94a3b8] transition hover:bg-white/[0.06] hover:text-[#e2e8f0]"
              >
                Dismiss
              </button>
            </div>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-[12px] leading-relaxed text-[#cbd5e1]">
              <li>
                Use the tools on the left to draw a site, or type a goal below and press Send.
              </li>
              <li>
                Turn layers on/off in Layers — scores only use checked layers (demo geometry).
              </li>
              <li>
                Open Siting risk score (top right) for the plain-English copilot reply after you run
                a prompt.
              </li>
            </ol>
            <p className="mt-2.5 text-[11px] font-medium text-[#94a3b8]">
              Sample prompts (tap to fill the box, then Send):
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {SAMPLE_PROMPTS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setCommand(s.text)}
                  className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-left text-[11px] font-medium text-[#e2e8f0] transition hover:border-sky-400/30 hover:bg-sky-500/10"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mb-2.5 flex items-center gap-2.5 px-2">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${running ? "animate-pulse bg-[#60a5fa]" : "bg-[#60a5fa]/50"}`}
            aria-hidden
          />
          <p className="text-[12px] font-normal text-[#94a3b8]">{statusLine}</p>
        </div>

        {showAnswerInRiskPanel ? (
          <p className="mb-2 px-2 text-center text-[11px] leading-snug text-[#94a3b8]" role="note">
            Plain-English reply is in{" "}
            <span className="font-semibold text-[#e2e8f0]">Siting risk score</span> (top right),
            under the number.
          </p>
        ) : null}

        <form
          className="regrid-copilot-pill flex items-stretch gap-1 border border-white/[0.08] bg-[#0d1117]/95 py-1 pl-4 pr-1 backdrop-blur-xl"
          onSubmit={(e) => {
            e.preventDefault();
            void handleRun();
          }}
        >
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={running}
            placeholder="Describe a siting goal — e.g. lowest risk near Pomona, 80 acres"
            className="min-w-0 flex-1 border-0 bg-transparent py-3 text-[13px] text-[#f1f5f9] placeholder:text-[#64748b] focus:outline-none focus:ring-0"
          />
          <button
            type="button"
            onClick={() => setTraceOpen((v) => !v)}
            className="hidden shrink-0 items-center gap-1 self-center rounded-full px-3 py-2 text-[11px] font-medium text-[#64748b] transition hover:bg-white/[0.05] hover:text-[#94a3b8] sm:flex"
          >
            Trace
            {traceOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="submit"
            disabled={!canRun}
            title="Run"
            className="flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-full bg-[#60a5fa] text-[#0a0e14] transition hover:bg-[#93c5fd] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Send className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </form>

        <AnimatePresence initial={false}>
          {traceOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="regrid-copilot-pill mt-2 overflow-hidden border border-white/[0.08] bg-[#0a0e14]/95"
            >
              <div className="max-h-28 overflow-y-auto px-4 py-2.5 font-mono text-[10px] leading-relaxed text-[#64748b]">
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
