import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AnalysisResult, DrawnShape, LayerDef, LayerId, ShapeKind } from "@/lib/regrid/types";
import { runSpatialCopilotDemo } from "@/lib/regrid/copilot";
import {
  enabledSetFromIntentFocus,
  runStructuredSpatialCopilot,
} from "@/lib/regrid/copilot-structured";
import { parseCopilotIntentFn } from "@/lib/regrid/parseCopilotIntent";
import { ChevronDown, ChevronUp, Send, Sparkles } from "lucide-react";

const COPILOT_TUTORIAL_DISMISS_KEY = "regrid:copilot-tutorial-dismiss";

const SAMPLE_PROMPTS: { label: string; text: string }[] = [
  { label: "Wind + city", text: "Lowest wind risk near Pomona" },
  { label: "City + acres", text: "80 acres lowest risk near Fresno" },
  { label: "Solar + region", text: "Lowest risk solar site in Central Valley, CA, risk under 35" },
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
  const lastAnthropicAttemptRef = useRef(0);
  const ANTHROPIC_CLIENT_COOLDOWN_MS = 3200;

  useEffect(() => {
    try {
      if (localStorage.getItem(COPILOT_TUTORIAL_DISMISS_KEY)) setTutorialDismissed(true);
    } catch {
      /* private mode */
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
        const now = Date.now();
        if (now - lastAnthropicAttemptRef.current < ANTHROPIC_CLIENT_COOLDOWN_MS) {
          append("client · llm_cooldown · fallback_regex");
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
          "Direct answer: the copilot crashed before finishing. Open Trace for details, or try a shorter prompt.",
        );
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-4 pb-4 pt-8 sm:px-6">
      <div className="pointer-events-auto mx-auto max-w-4xl">
        {/* ── Getting started tutorial ─────────────────────────── */}
        {!tutorialDismissed ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 rounded-2xl border border-sky-400/15 bg-[#070d18]/95 px-4 py-3.5 shadow-xl backdrop-blur-xl"
          >
            {/* Top accent */}
            <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-sky-400/30 to-transparent" />

            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-sky-400" strokeWidth={1.8} />
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-300/90">
                  Getting started
                </p>
              </div>
              <button
                type="button"
                onClick={dismissTutorial}
                className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-300"
              >
                Dismiss
              </button>
            </div>

            <ol className="mt-2.5 list-decimal space-y-1 pl-4 text-[11.5px] leading-relaxed text-slate-400">
              <li>Draw a site using the tools on the left, or type a goal below and press Send.</li>
              <li>Toggle layers on/off — scores only use checked layers (demo geometry).</li>
              <li>
                Open{" "}
                <span className="font-medium text-slate-200">Siting score</span> (top right) for
                the plain-English copilot reply.
              </li>
            </ol>

            <p className="mt-3 text-[10.5px] font-medium text-slate-600">
              Try a sample prompt:
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {SAMPLE_PROMPTS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setCommand(s.text)}
                  className="rounded-full border border-white/[0.09] bg-white/[0.04] px-3 py-1.5 text-left text-[11px] font-medium text-slate-300 transition hover:border-sky-400/25 hover:bg-sky-500/9 hover:text-sky-200"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}

        {/* ── Status line ──────────────────────────────────────── */}
        <div className="mb-2 flex items-center gap-2.5 px-2">
          <span className="relative flex h-[7px] w-[7px] shrink-0">
            {running && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-70" />
            )}
            <span
              className={`relative inline-flex h-[7px] w-[7px] rounded-full transition duration-300 ${
                running ? "bg-cyan-400" : "bg-cyan-400/35"
              }`}
            />
          </span>
          <p className="text-[11.5px] font-normal text-slate-500">{statusLine}</p>
        </div>

        {/* Answer hint */}
        {showAnswerInRiskPanel ? (
          <p className="mb-2 px-2 text-center text-[10.5px] leading-snug text-slate-600" role="note">
            Plain-English reply is in{" "}
            <span className="font-semibold text-slate-400">Siting score</span> (top right).
          </p>
        ) : null}

        {/* ── Input pill ───────────────────────────────────────── */}
        <div className="relative">
          {/* Running shimmer border */}
          {running && (
            <div className="absolute -inset-[1px] rounded-[9999px] bg-gradient-to-r from-cyan-500/40 via-blue-500/30 to-indigo-500/40 opacity-80 blur-[2px]" />
          )}
          <form
            className="regrid-copilot-pill relative flex items-stretch gap-1 border border-white/[0.07] bg-[#080e18]/96 py-1 pl-4 pr-1 backdrop-blur-xl"
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
              className="min-w-0 flex-1 border-0 bg-transparent py-3 text-[13px] text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-0"
            />
            <button
              type="button"
              onClick={() => setTraceOpen((v) => !v)}
              className="hidden shrink-0 items-center gap-1 self-center rounded-full px-3 py-2 text-[11px] font-medium text-slate-600 transition hover:bg-white/[0.05] hover:text-slate-400 sm:flex"
            >
              Trace
              {traceOpen ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            <button
              type="submit"
              disabled={!canRun}
              title="Send"
              className={`flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-full transition duration-150 ${
                canRun
                  ? "bg-gradient-to-br from-cyan-400 to-blue-500 text-[#020e18] shadow-[0_6px_18px_rgba(34,211,238,0.28)] hover:brightness-110"
                  : "bg-white/[0.06] text-white/25"
              } disabled:cursor-not-allowed`}
            >
              <Send className="h-4 w-4" strokeWidth={2.2} />
            </button>
          </form>
        </div>

        {/* ── Trace log ────────────────────────────────────────── */}
        <AnimatePresence initial={false}>
          {traceOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="regrid-copilot-pill mt-2 overflow-hidden border border-white/[0.06] bg-[#060b14]/96"
            >
              <div className="max-h-28 overflow-y-auto px-4 py-2.5 font-mono text-[10px] leading-relaxed text-slate-600">
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
