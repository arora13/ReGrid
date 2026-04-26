import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { loginOrSignup } from "@/lib/regrid/user-store";

interface UserAuthGateProps {
  onAuthenticated: (email: string) => void;
  onDismiss: () => void;
}

export function UserAuthGate({ onAuthenticated, onDismiss }: UserAuthGateProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const switchMode = (next: "login" | "signup") => {
    setMode(next);
    setError(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "signup" && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    const res = loginOrSignup(email.trim(), password);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    onAuthenticated(email.trim().toLowerCase());
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-white/[0.09] bg-[#07101c]/98 shadow-[0_40px_80px_rgba(0,0,0,0.7)] backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />

        {/* Dismiss */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-lg text-white/25 transition hover:bg-white/[0.07] hover:text-white/60"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="px-7 pb-7 pt-6">
          {/* Logo */}
          <div className="mb-6 flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.04]">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-white/55" fill="currentColor">
                <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.3L18.5 8 12 11.7 5.5 8 12 4.3zM5 9.7l6 3.45V20l-6-3.33V9.7zm14 7l-6 3.33v-6.85l6-3.45v6.97z" />
              </svg>
            </div>
            <span className="text-[14px]">
              <span className="font-light italic text-white/40">Re</span>
              <span className="font-bold text-white">Grid</span>
            </span>
          </div>

          {/* Mode tabs */}
          <div className="mb-5 flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 rounded-lg py-2 text-[12.5px] font-medium transition duration-150 ${
                  mode === m
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-white/38 hover:text-white/65"
                }`}
              >
                {m === "login" ? "Log in" : "Create account"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-white/48">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[13.5px] text-white placeholder:text-white/22 outline-none transition focus:border-white/22 focus:bg-white/[0.07]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-white/48">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[13.5px] text-white placeholder:text-white/22 outline-none transition focus:border-white/22 focus:bg-white/[0.07]"
              />
              {mode === "signup" && (
                <p className="mt-1 text-[10.5px] text-white/28">Minimum 6 characters.</p>
              )}
            </div>

            {error && (
              <p className="rounded-lg border border-rose-400/22 bg-rose-500/10 px-3 py-2 text-[11.5px] text-rose-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="mt-1 w-full rounded-xl border border-white/12 bg-white/[0.07] py-2.5 text-[13.5px] font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.12]"
            >
              {mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>

          <p className="mt-4 text-center text-[11px] text-white/25">
            {mode === "login" ? "No account? " : "Already have one? "}
            <button
              type="button"
              onClick={() => switchMode(mode === "login" ? "signup" : "login")}
              className="text-white/45 underline-offset-2 transition hover:text-white/70 hover:underline"
            >
              {mode === "login" ? "Create one" : "Log in"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
