import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AnalysisResult, DrawnShape, LayerId, ShapeKind } from "@/lib/regrid/types";
import { runSpatialCopilotDemo } from "@/lib/regrid/copilot";
import { ChevronDown, ChevronUp } from "lucide-react";

interface SpatialCopilotProps {
  enabledLayers: Set<LayerId>;
  shapeKind: ShapeKind;
  flyTo: (center: [number, number], zoom?: number) => void;
  onApplyShape: (shape: DrawnShape | null) => void;
  onApplyAnalysis: (result: AnalysisResult | null) => void;
  onCopilotRunningChange?: (running: boolean) => void;
}

export function SpatialCopilot({
  enabledLayers,
  shapeKind,
  flyTo,
  onApplyShape,
  onApplyAnalysis,
  onCopilotRunningChange,
}: SpatialCopilotProps) {
  const [open, setOpen] = useState(false);
  const [chipsOpen, setChipsOpen] = useState(false);
  const [command, setCommand] = useState(
    "Find me a 50 acre site near transmission with a risk score under 20 anywhere in the U.S.",
  );
  const [log, setLog] = useState<string[]>(["system · copilot_ready · bounded_tool_loop=true"]);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    onCopilotRunningChange?.(running);
  }, [running, onCopilotRunningChange]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [log, open]);

  const canRun = useMemo(() => command.trim().length > 0 && !running, [command, running]);

  const append = (line: string) => setLog((prev) => [...prev.slice(-220), line]);

  const MISSION_CHIPS = useMemo(
    () => [
      "50 acres near transmission in Texas, risk under 20",
      "Battery site in Texas: avoid wildfire + EJ overlap, risk under 25",
      "Grid-tied solar in the Midwest: prioritize transmission access, risk under 35",
    ],
    [],
  );

  const handleRun = async () => {
    if (!canRun) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setRunning(true);
    setOpen(true);
    append("run · start");
    try {
      await runSpatialCopilotDemo({
        command,
        enabledLayers,
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
      if (err?.name === "AbortError") {
        append("run · aborted");
      } else {
        append("run · error (see console)");

        console.error(e);
      }
    } finally {
      setRunning(false);
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  return (
    <div className="pointer-events-none z-30 shrink-0 border-t border-white/[0.08] bg-gradient-to-t from-background via-background/95 to-background/80 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
      <div className="pointer-events-auto mx-auto w-full max-w-[920px] px-1 sm:px-2">
        <motion.div
          layout
          className="glass overflow-hidden rounded-2xl border border-white/[0.08] shadow-sm"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-2.5">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-foreground/95">Spatial copilot</p>
              <p className="truncate text-[11px] text-muted-foreground">
                Command bar · tool receipts · bounded search
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-foreground/90 transition hover:border-white/20 hover:bg-white/[0.05]"
              >
                Trace
                {open ? (
                  <ChevronUp className="h-3.5 w-3.5 opacity-70" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                )}
              </button>
              <button
                type="button"
                onClick={handleStop}
                disabled={!running}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-white/20 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                Stop
              </button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="border-b border-white/[0.06]"
              >
                <div className="max-h-32 overflow-y-auto px-4 py-2.5 font-mono text-[11px] leading-snug text-foreground/90">
                  {log.map((line, idx) => (
                    <div key={`${idx}-${line}`} className="whitespace-pre-wrap">
                      {line}
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form
            className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
            onSubmit={(e) => {
              e.preventDefault();
              void handleRun();
            }}
          >
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              disabled={running}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25"
              placeholder='Try: "50 acres near transmission in Texas, risk under 20"'
            />
            <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0">
              <button
                type="submit"
                disabled={!canRun}
                className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
              >
                Run copilot
              </button>
            </div>
          </form>

          <div className="border-t border-white/[0.06] px-3 pb-2 pt-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Suggested missions
              </p>
              <button
                type="button"
                onClick={() => setChipsOpen((v) => !v)}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-muted-foreground transition hover:border-white/20 hover:text-foreground"
              >
                {chipsOpen ? "Hide" : "Show"}
              </button>
            </div>
            {chipsOpen && (
              <div className="mt-2 flex flex-wrap gap-2">
                {MISSION_CHIPS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    disabled={running}
                    onClick={() => setCommand(c)}
                    className="max-w-full rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-foreground/90 transition hover:border-white/20 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="block max-w-[520px] truncate">{c}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
