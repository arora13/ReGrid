import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AnalysisResult, DrawnShape, LayerDef, LayerId, ShapeKind } from "@/lib/regrid/types";
import { runSpatialCopilotDemo } from "@/lib/regrid/copilot";
import { ChevronDown, ChevronUp, Send } from "lucide-react";

interface SpatialCopilotProps {
  allLayers: LayerDef[];
  enabledLayers: Set<LayerId>;
  shapeKind: ShapeKind;
  flyTo: (center: [number, number], zoom?: number) => void;
  onApplyShape: (shape: DrawnShape | null) => void;
  onApplyAnalysis: (result: AnalysisResult | null) => void;
  onCopilotRunningChange?: (running: boolean) => void;
  statusLine?: string;
}

export function SpatialCopilot({
  allLayers,
  enabledLayers,
  shapeKind,
  flyTo,
  onApplyShape,
  onApplyAnalysis,
  onCopilotRunningChange,
  statusLine = "Describe a siting goal in natural language",
}: SpatialCopilotProps) {
  const [traceOpen, setTraceOpen] = useState(false);
  const [command, setCommand] = useState("");
  const [log, setLog] = useState<string[]>(["system · copilot_ready"]);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

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
    append("run · start");
    try {
      await runSpatialCopilotDemo({
        command,
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
      append("run · complete");
    } catch (e) {
      const err = e as { name?: string };
      if (err?.name === "AbortError") append("run · aborted");
      else {
        append("run · error");
        console.error(e);
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-4 pb-4 pt-8 sm:px-6">
      <div className="pointer-events-auto mx-auto max-w-4xl">
        <div className="mb-2.5 flex items-center gap-2.5 px-2">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${running ? "animate-pulse bg-[#60a5fa]" : "bg-[#60a5fa]/50"}`}
            aria-hidden
          />
          <p className="text-[12px] font-normal text-[#94a3b8]">{statusLine}</p>
        </div>

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
            placeholder="Describe a siting goal — e.g. lowest-risk wind site near Cape Cod"
            className="min-w-0 flex-1 border-0 bg-transparent py-3 text-[13px] text-[#f1f5f9] placeholder:text-[#64748b] focus:outline-none focus:ring-0"
          />
          <button
            type="button"
            onClick={() => setTraceOpen((v) => !v)}
            className="hidden shrink-0 items-center gap-1 self-center rounded-full px-3 py-2 text-[11px] font-medium text-[#64748b] transition hover:bg-white/[0.05] hover:text-[#94a3b8] sm:flex"
          >
            Trace
            {traceOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
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
