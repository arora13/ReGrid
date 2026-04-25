import { motion } from "framer-motion";
import type { LayerDef, LayerId } from "@/lib/regrid/types";

interface LayerStackProps {
  layers: LayerDef[];
  enabled: Set<LayerId>;
  onToggle: (id: LayerId) => void;
}

export function LayerStack({ layers, enabled, onToggle }: LayerStackProps) {
  return (
    <motion.aside
      initial={{ x: -40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="glass-strong pointer-events-auto absolute top-24 left-6 z-20 w-[320px] rounded-2xl p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-[0.25em] text-primary/80 uppercase">
            01 · Layer Stack
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Federal Datasets</h2>
        </div>
        <div className="h-2 w-2 animate-pulse-ring rounded-full bg-primary" />
      </div>

      <div className="space-y-2">
        {layers.map((layer) => {
          const on = enabled.has(layer.id);
          return (
            <button
              key={layer.id}
              onClick={() => onToggle(layer.id)}
              className={`group flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                on
                  ? "border-primary/40 bg-primary/[0.06]"
                  : "border-white/[0.04] bg-white/[0.02] hover:border-white/10"
              }`}
            >
              <span
                className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{
                  backgroundColor: layer.color,
                  boxShadow: on ? `0 0 12px ${layer.color}` : "none",
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">{layer.name}</div>
                <div className="mt-0.5 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                  {layer.agency}
                </div>
              </div>
              <div
                className={`mt-1 h-4 w-7 rounded-full border transition-colors ${
                  on ? "border-primary/60 bg-primary/30" : "border-white/15 bg-white/5"
                }`}
              >
                <div
                  className={`h-full w-3.5 rounded-full transition-transform ${
                    on ? "translate-x-3 bg-primary glow-emerald" : "translate-x-0 bg-muted-foreground/60"
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 border-t border-white/[0.06] pt-3 font-mono text-[10px] tracking-wide text-muted-foreground/80 uppercase">
        {enabled.size} / {layers.length} layers active
      </div>
    </motion.aside>
  );
}
