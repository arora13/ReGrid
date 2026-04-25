import { motion } from "framer-motion";
import type { ShapeKind } from "@/lib/regrid/types";

interface ToolPaletteProps {
  active: ShapeKind | null;
  onSelect: (kind: ShapeKind) => void;
  onClear: () => void;
  hasShape: boolean;
}

const TOOLS: { kind: ShapeKind; label: string; icon: React.ReactNode }[] = [
  {
    kind: "circle",
    label: "Circle",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <circle cx="12" cy="12" r="8" />
      </svg>
    ),
  },
  {
    kind: "square",
    label: "Square",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <rect x="4.5" y="4.5" width="15" height="15" />
      </svg>
    ),
  },
  {
    kind: "hexagon",
    label: "Hexagon",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <path d="M12 3l7.5 4.5v9L12 21l-7.5-4.5v-9L12 3z" />
      </svg>
    ),
  },
];

export function ToolPalette({ active, onSelect, onClear, hasShape }: ToolPaletteProps) {
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
      className="pointer-events-auto absolute bottom-8 left-1/2 z-20 -translate-x-1/2"
    >
      <div className="glass-strong flex items-center gap-2 rounded-2xl p-2">
        <div className="px-3 py-2">
          <p className="font-mono text-[10px] tracking-[0.25em] text-primary uppercase">02 · Project</p>
          <p className="text-[11px] text-muted-foreground">Drop footprint</p>
        </div>
        <div className="h-10 w-px bg-white/10" />

        {TOOLS.map((t) => {
          const isActive = active === t.kind;
          return (
            <button
              key={t.kind}
              onClick={() => onSelect(t.kind)}
              className={`group flex h-14 w-16 flex-col items-center justify-center rounded-xl border transition-all ${
                isActive
                  ? "border-primary/60 bg-primary/15 text-primary glow-emerald"
                  : "border-white/[0.06] text-muted-foreground hover:border-white/15 hover:text-foreground"
              }`}
            >
              {t.icon}
              <span className="mt-1 text-[10px] font-medium tracking-wide">{t.label}</span>
            </button>
          );
        })}

        <div className="h-10 w-px bg-white/10" />
        <button
          onClick={onClear}
          disabled={!hasShape}
          className="h-14 rounded-xl border border-white/[0.06] px-4 text-xs font-medium text-muted-foreground transition-all hover:border-destructive/40 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/[0.06] disabled:hover:text-muted-foreground"
        >
          Clear
        </button>
      </div>
      {active && !hasShape && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-center font-mono text-[11px] tracking-wider text-primary/90 uppercase animate-flicker"
        >
          ▸ Click anywhere on the map to place {active}
        </motion.p>
      )}
    </motion.div>
  );
}
