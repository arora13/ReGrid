import { motion } from "framer-motion";

interface TopBarProps {
  shapeCount: number;
  hasResult: boolean;
  riskScore: number | null;
}

export function TopBar({ shapeCount, hasResult, riskScore }: TopBarProps) {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="pointer-events-auto absolute top-6 right-6 left-6 z-20 flex items-center justify-between"
    >
      <div className="glass-strong flex items-center gap-3 rounded-2xl px-5 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-glow glow-emerald">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-background" fill="currentColor">
            <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.3L18.5 8 12 11.7 5.5 8 12 4.3zM5 9.7l6 3.45V20l-6-3.33V9.7zm14 7l-6 3.33v-6.85l6-3.45v6.97z" />
          </svg>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-bold tracking-tight">ReGrid</h1>
            <span className="font-mono text-[9px] tracking-[0.25em] text-primary uppercase">
              v0.3 · Beta
            </span>
          </div>
          <p className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
            Spatial Intelligence · Clean Energy Siting
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Stat label="Sites" value={String(shapeCount)} />
        <Stat
          label="Active Risk"
          value={hasResult && riskScore !== null ? String(riskScore) : "—"}
          accent={
            riskScore === null
              ? undefined
              : riskScore >= 60
                ? "#f87171"
                : riskScore >= 30
                  ? "#fbbf24"
                  : "#34d399"
          }
        />
        <div className="glass-strong flex items-center gap-2 rounded-2xl px-4 py-3">
          <div className="h-2 w-2 animate-pulse-ring rounded-full bg-primary" />
          <span className="font-mono text-[10px] tracking-[0.2em] text-foreground/80 uppercase">
            Live · DOE Ready
          </span>
        </div>
      </div>
    </motion.header>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="glass-strong rounded-2xl px-4 py-3">
      <div className="font-mono text-[9px] tracking-[0.25em] text-muted-foreground uppercase">
        {label}
      </div>
      <div
        className="text-lg font-semibold tabular-nums"
        style={accent ? { color: accent, textShadow: `0 0 12px ${accent}80` } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
