import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AnalysisResult, DrawnShape, LayerId, ShapeKind } from "@/lib/regrid/types";
import { runSpatialCopilotDemo } from "@/lib/regrid/copilot";

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
  const [open, setOpen] = useState(true);
  const [command, setCommand] = useState(
    "Find me a 50 acre site near a transmission line in California with a risk score under 20.",
  );
  const [log, setLog] = useState<string[]>([
    "> copilot online · bounded spatial search · max 3 evaluations + 1 grid pass",
  ]);
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

  const handleRun = async () => {
    if (!canRun) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setRunning(true);
    append("> ─ run start ─");
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
      append("> ─ run complete ─");
    } catch (e) {
      const err = e as { name?: string };
      if (err?.name === "AbortError") {
        append("> aborted");
      } else {
        append("> error: copilot run failed (see console)");
        // eslint-disable-next-line no-console
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
    <div className="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex justify-center px-6">
      <div className="pointer-events-auto w-full max-w-5xl">
        <motion.div layout className="glass-strong overflow-hidden rounded-2xl border border-white/[0.06]">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
            <div className="min-w-0">
              <p className="font-mono text-[10px] tracking-[0.25em] text-primary/80 uppercase">
                04 · Spatial Copilot
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Natural language → bounded tool loop → streamed trace → map fly-to
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-foreground/90 hover:bg-white/[0.06]"
              >
                {open ? "Hide log" : "Show log"}
              </button>
              <button
                type="button"
                onClick={handleStop}
                disabled={!running}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
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
                <div className="max-h-40 overflow-y-auto px-4 py-3 font-mono text-[11px] leading-relaxed text-foreground/90">
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
            className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center"
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
              placeholder='Try: "50 acres near transmission in CA, risk under 20"'
            />
            <button
              type="submit"
              disabled={!canRun}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-primary/50 bg-primary/15 px-5 py-3 text-sm font-semibold text-primary transition-all hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-40 enabled:glow-emerald"
            >
              <span className="h-2 w-2 rounded-full bg-primary" />
              Run Copilot
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
