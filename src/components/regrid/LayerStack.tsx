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
      className="glass-strong pointer-events-auto absolute top-28 left-8 z-20 w-[300px] rounded-2xl p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[0.25em] text-primary/80 uppercase">Layers</p>
          <h2 className="mt-0.5 truncate text-base font-semibold tracking-tight">Datasets</h2>
        </div>
        <div className="shrink-0 rounded-full border border-white/10 bg-black/15 px-2 py-1 font-mono text-[10px] text-muted-foreground">
          {enabled.size}/{layers.length}
        </div>
      </div>

      <div className="space-y-1.5">
        {layers.map((layer) => {
          const on = enabled.has(layer.id);
          return (
            <button
              key={layer.id}
              onClick={() => onToggle(layer.id)}
              className={`group flex w-full items-start gap-3 rounded-xl border p-2.5 text-left transition-all ${
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
                    on ? "translate-x-3 bg-primary" : "translate-x-0 bg-muted-foreground/60"
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>
    </motion.aside>
  );
}
