import { useEffect, useMemo, useState } from "react";
import { loginOrSignup, loginWithGoogle } from "@/lib/regrid/user-store";

interface UserAuthGateProps {
  onAuthenticated: (email: string) => void;
}

interface GoogleIdApi {
  accounts: {
    id: {
      initialize: (opts: {
        client_id: string;
        callback: (resp: { credential?: string }) => void;
      }) => void;
      prompt: () => void;
    };
  };
}

export function UserAuthGate({ onAuthenticated }: UserAuthGateProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const googleClientId = useMemo(
    () => (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || "",
    [],
  );

  useEffect(() => {
    if (!googleClientId) return;
    const id = "google-identity-script";
    if (document.getElementById(id)) return;
    const s = document.createElement("script");
    s.id = id;
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  }, [googleClientId]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = loginOrSignup(email, password);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    onAuthenticated(email.trim().toLowerCase());
  };

  const loginGoogle = () => {
    if (!googleClientId) {
      setError("Google sign-in needs VITE_GOOGLE_CLIENT_ID in .env.local");
      return;
    }
    const g = (window as Window & { google?: GoogleIdApi }).google;
    if (!g?.accounts?.id) {
      setError("Google script not loaded yet. Try again in a second.");
      return;
    }
    g.accounts.id.initialize({
      client_id: googleClientId,
      callback: (resp: { credential?: string }) => {
        try {
          const token = resp.credential;
          if (!token) {
            setError("Google login failed.");
            return;
          }
          const payload = JSON.parse(atob(token.split(".")[1])) as {
            email?: string;
            name?: string;
          };
          if (!payload.email) {
            setError("Google account email missing.");
            return;
          }
          const res = loginWithGoogle(payload.email, payload.name);
          if (!res.ok) {
            setError(res.message);
            return;
          }
          onAuthenticated(payload.email.toLowerCase());
        } catch {
          setError("Google login parse failed.");
        }
      },
    });
    g.accounts.id.prompt();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-cyan-300/20 bg-[#07101a]/95 p-6 shadow-2xl"
      >
        <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/70">ReGrid Account</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Log in or create account</h2>
        <p className="mt-2 text-sm text-white/55">
          Use any email + password. This v1 stores dashboard history locally in your browser.
        </p>

        <button
          type="button"
          onClick={loginGoogle}
          className="mt-4 w-full rounded-md border border-white/15 bg-white/8 py-2.5 text-sm font-semibold text-white hover:bg-white/12"
        >
          Continue with Google
        </button>
        <p className="mt-2 text-center text-[11px] text-white/35">or use email + password</p>

        <label className="mt-5 block text-xs text-white/60">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/50"
          placeholder="you@example.com"
        />
        <label className="mt-3 block text-xs text-white/60">Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/50"
          placeholder="••••••••"
        />
        {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}

        <button
          type="submit"
          className="mt-5 w-full rounded-md bg-gradient-to-r from-cyan-400 to-blue-400 py-2.5 text-sm font-semibold text-[#04121b]"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
