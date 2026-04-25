import { motion } from "framer-motion";
import type { LayerDef, LayerId } from "@/lib/regrid/types";

interface LayersDockProps {
  layers: LayerDef[];
  enabled: Set<LayerId>;
  onToggle: (id: LayerId) => void;
}

export function LayersDock({ layers, enabled, onToggle }: LayersDockProps) {
  return (
    <motion.aside
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
      className="pointer-events-auto absolute bottom-32 left-8 z-20 w-[280px]"
    >
      <div className="glass rounded-2xl border border-white/[0.08] p-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-foreground/90">Layers</p>
            <p className="text-[11px] text-muted-foreground">Toggle constraints</p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {enabled.size}/{layers.length}
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          {layers.map((layer) => {
            const on = enabled.has(layer.id);
            return (
              <button
                key={layer.id}
                type="button"
                onClick={() => onToggle(layer.id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition ${
                  on
                    ? "border-white/15 bg-white/[0.04]"
                    : "border-white/[0.06] bg-transparent hover:border-white/15 hover:bg-white/[0.03]"
                }`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: layer.color }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium text-foreground">{layer.name}</div>
                  <div className="truncate text-[10px] text-muted-foreground">{layer.agency}</div>
                </div>
                <span
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition ${
                    on ? "border-primary/35 bg-primary/15" : "border-white/10 bg-black/20"
                  }`}
                  aria-hidden
                >
                  <span
                    className={`ml-0.5 inline-block h-4 w-4 rounded-full bg-white/90 transition ${
                      on ? "translate-x-3.5" : "translate-x-0.5"
                    }`}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.aside>
  );
}
