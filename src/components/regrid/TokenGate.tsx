import { useState } from "react";

interface TokenGateProps {
  onSubmit: (token: string) => void;
}

export function TokenGate({ onSubmit }: TokenGateProps) {
  const [value, setValue] = useState("");
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background grid-overlay">
      <div className="glass-strong w-full max-w-md rounded-2xl p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-glow glow-emerald">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-background" fill="currentColor">
              <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">ReGrid</h1>
            <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              Spatial Intelligence Platform
            </p>
          </div>
        </div>

        <p className="mb-2 text-sm text-foreground">Mapbox access token required</p>
        <p className="mb-5 text-xs text-muted-foreground">
          Paste your public Mapbox token (starts with{" "}
          <code className="font-mono text-primary">pk.</code>) to load the dark satellite basemap.
          Get one free at{" "}
          <a
            href="https://account.mapbox.com/access-tokens/"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline-offset-2 hover:underline"
          >
            mapbox.com
          </a>
          .
        </p>
        <p className="mb-5 text-xs text-muted-foreground">
          Tip: for local dev you can also set{" "}
          <code className="font-mono text-primary">VITE_MAPBOX_TOKEN</code> in{" "}
          <code className="font-mono text-primary">.env.local</code> and reload — this screen will
          disappear automatically.
        </p>

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
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="submit"
            disabled={!value.trim()}
            className="w-full rounded-xl border border-primary/50 bg-primary/15 py-3 text-sm font-semibold text-primary transition-all hover:bg-primary/25 disabled:opacity-40 enabled:glow-emerald"
          >
            Initialize Map →
          </button>
        </form>

        <p className="mt-4 font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">
          If entered here, token is stored in browser localStorage only.
        </p>
      </div>
    </div>
  );
}
