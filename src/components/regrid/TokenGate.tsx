import { useState } from "react";
import { motion } from "framer-motion";

interface TokenGateProps {
  onSubmit: (token: string) => void;
}

export function TokenGate({ onSubmit }: TokenGateProps) {
  const [value, setValue] = useState("");

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#04080f]">
      {/* Background radial glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-cyan-500/[0.06] blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[500px] rounded-full bg-indigo-500/[0.05] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[500px] rounded-full bg-blue-500/[0.04] blur-3xl" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.028]"
          style={{
            backgroundImage:
              "linear-gradient(rgb(103 232 249 / 1) 1px, transparent 1px), linear-gradient(90deg, rgb(103 232 249 / 1) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-[420px] px-4"
      >
        {/* Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#07101c]/95 shadow-[0_32px_80px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-xl">
          {/* Top accent line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
          {/* Corner glow */}
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cyan-400/10 blur-2xl" />

          <div className="relative px-7 pb-7 pt-8">
            {/* Logo row */}
            <div className="mb-7 flex items-center gap-3.5">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-400/30 to-indigo-500/20 blur-md" />
                <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/25 bg-gradient-to-br from-[#0d1f30] to-[#091525]">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-cyan-300" fill="currentColor">
                    <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.3L18.5 8 12 11.7 5.5 8 12 4.3zM5 9.7l6 3.45V20l-6-3.33V9.7zm14 7l-6 3.33v-6.85l6-3.45v6.97z" />
                  </svg>
                </div>
              </div>
              <div>
                <h1 className="bg-gradient-to-r from-cyan-100 via-sky-100 to-indigo-200 bg-clip-text text-xl font-bold tracking-tight text-transparent">
                  ReGrid
                </h1>
                <p className="mt-0.5 font-mono text-[9.5px] tracking-[0.22em] text-slate-600 uppercase">
                  Spatial Intelligence Platform
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="mb-6 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

            {/* Body copy */}
            <p className="mb-1 text-[14px] font-semibold text-slate-200">
              Mapbox access token required
            </p>
            <p className="mb-4 text-[12.5px] leading-relaxed text-slate-500">
              Paste your public token (starts with{" "}
              <code className="rounded px-1 py-0.5 font-mono text-[11px] text-cyan-400 bg-cyan-400/8">
                pk.
              </code>
              ) to load the satellite basemap. Get one free at{" "}
              <a
                href="https://account.mapbox.com/access-tokens/"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 underline-offset-2 hover:underline"
              >
                mapbox.com
              </a>
              .
            </p>

            <p className="mb-5 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 text-[11.5px] leading-relaxed text-slate-600">
              <span className="font-semibold text-slate-500">Tip:</span> Set{" "}
              <code className="font-mono text-cyan-500/80">VITE_MAPBOX_TOKEN</code> in{" "}
              <code className="font-mono text-cyan-500/80">.env.local</code> to skip this screen.
            </p>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (value.trim()) onSubmit(value.trim());
              }}
              className="space-y-3"
            >
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="pk.eyJ1Ijoi..."
                autoFocus
                className="w-full rounded-xl border border-white/[0.09] bg-white/[0.03] px-4 py-3 font-mono text-[12px] text-slate-200 placeholder:text-slate-700 transition duration-150 focus:border-cyan-400/40 focus:bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-cyan-400/20"
              />
              <button
                type="submit"
                disabled={!value.trim()}
                className="w-full rounded-xl border border-cyan-400/30 bg-gradient-to-r from-cyan-500/15 to-blue-500/12 py-3 text-[13px] font-semibold text-cyan-100 shadow-[0_8px_20px_rgba(34,211,238,0.12)] transition-all duration-150 hover:border-cyan-400/50 hover:from-cyan-500/22 hover:to-blue-500/18 hover:shadow-[0_8px_24px_rgba(34,211,238,0.2)] disabled:cursor-not-allowed disabled:opacity-35"
              >
                Initialize Map →
              </button>
            </form>

            <p className="mt-4 text-center font-mono text-[9.5px] tracking-wider text-slate-700 uppercase">
              Token stored in browser localStorage only
            </p>
          </div>
        </div>

        {/* Below-card hint */}
        <p className="mt-4 text-center text-[11px] text-slate-700">
          ReGrid · Clean Energy Siting Intelligence · Beta
        </p>
      </motion.div>
    </div>
  );
}
