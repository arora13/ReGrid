import { motion } from "framer-motion";

interface TopBarProps {
  shapeCount: number;
  hasResult: boolean;
  riskScore: number | null;
}

export function TopBar({ shapeCount, hasResult, riskScore }: TopBarProps) {
  const riskAccent =
    riskScore === null
      ? undefined
      : riskScore >= 60
        ? "#f87171"
        : riskScore >= 30
          ? "#fbbf24"
          : "#34d399";

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="pointer-events-auto absolute top-8 right-8 left-8 z-20 flex items-center justify-between gap-4"
    >
      <div className="glass-strong flex min-w-0 items-center gap-3 rounded-2xl px-4 py-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-glow">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-background" fill="currentColor">
            <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.3L18.5 8 12 11.7 5.5 8 12 4.3zM5 9.7l6 3.45V20l-6-3.33V9.7zm14 7l-6 3.33v-6.85l6-3.45v6.97z" />
          </svg>
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">ReGrid</h1>
            <span className="hidden font-mono text-[9px] tracking-[0.25em] text-primary/80 uppercase sm:inline">
              Beta
            </span>
          </div>
          <p className="truncate font-mono text-[10px] tracking-wider text-muted-foreground/80 uppercase">
            Clean energy siting intelligence
          </p>
        </div>
      </div>

      <div className="glass-strong flex items-center gap-4 rounded-2xl px-4 py-2.5">
        <div className="hidden text-right sm:block">
          <div className="font-mono text-[9px] tracking-[0.25em] text-muted-foreground uppercase">Sites</div>
          <div className="text-sm font-semibold tabular-nums">{shapeCount}</div>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div className="text-right">
          <div className="font-mono text-[9px] tracking-[0.25em] text-muted-foreground uppercase">Risk</div>
          <div
            className="text-sm font-semibold tabular-nums"
            style={
              hasResult && riskScore !== null && riskAccent
                ? { color: riskAccent, textShadow: `0 0 14px ${riskAccent}66` }
                : undefined
            }
          >
            {hasResult && riskScore !== null ? riskScore : "—"}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
