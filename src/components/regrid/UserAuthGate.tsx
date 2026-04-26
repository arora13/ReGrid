import { useEffect, useMemo, useRef, useState } from "react";
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
      renderButton: (
        parent: HTMLElement,
        options: {
          theme?: "outline" | "filled_blue" | "filled_black";
          size?: "large" | "medium" | "small";
          width?: string;
          shape?: "rectangular" | "pill";
        },
      ) => void;
      prompt: () => void;
    };
  };
}

function decodeJwtPayload(token: string): { email?: string; name?: string } {
  const payload = token.split(".")[1];
  if (!payload) return {};
  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return JSON.parse(atob(padded)) as { email?: string; name?: string };
}

export function UserAuthGate({ onAuthenticated }: UserAuthGateProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const googleClientId = useMemo(
    () => (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || "",
    [],
  );
  const googleConfigured = googleClientId.length > 0;
  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  const googleInitRef = useRef(false);

  const handleGoogleCredential = (resp: { credential?: string }) => {
    try {
      const token = resp.credential;
      if (!token) {
        setError("Google login failed.");
        return;
      }
      const payload = decodeJwtPayload(token);
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
  };

  const ensureGoogleApi = async (): Promise<GoogleIdApi["accounts"]["id"] | null> => {
    const existing = (window as Window & { google?: GoogleIdApi }).google?.accounts?.id;
    if (existing) {
      setGoogleReady(true);
      return existing;
    }

    const scriptId = "google-identity-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      script!.addEventListener("load", finish, { once: true });
      script!.addEventListener("error", finish, { once: true });
      window.setTimeout(finish, 2500);
    });

    const idApi = (window as Window & { google?: GoogleIdApi }).google?.accounts?.id ?? null;
    setGoogleReady(!!idApi);
    return idApi;
  };

  useEffect(() => {
    if (!googleClientId) return;
    void ensureGoogleApi().then((idApi) => {
      if (idApi) setGoogleReady(true);
    });
  }, [googleClientId]);

  useEffect(() => {
    if (!googleConfigured || !googleBtnRef.current) return;
    const g = (window as Window & { google?: GoogleIdApi }).google;
    if (!g?.accounts?.id) return;
    if (!googleInitRef.current) {
      g.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredential,
      });
      googleInitRef.current = true;
    }

    googleBtnRef.current.innerHTML = "";
    g.accounts.id.renderButton(googleBtnRef.current, {
      theme: "outline",
      size: "large",
      width: "320",
      shape: "rectangular",
    });
  }, [googleClientId, googleConfigured, onAuthenticated, googleReady]);

  useEffect(() => {
    if (!googleConfigured || googleReady) return;
    const t = window.setInterval(() => {
      const g = (window as Window & { google?: GoogleIdApi }).google;
      if (g?.accounts?.id) {
        setGoogleReady(true);
        window.clearInterval(t);
      }
    }, 300);
    return () => window.clearInterval(t);
  }, [googleConfigured, googleReady]);

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
    void ensureGoogleApi().then((idApi) => {
      if (!idApi) {
        setError("Google SDK not available. Disable ad blockers for localhost and retry.");
        return;
      }
      if (!googleInitRef.current) {
        idApi.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredential,
        });
        googleInitRef.current = true;
      }
      idApi.prompt();
    });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#03070d]/80 p-4 backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[480px] w-[760px] -translate-x-1/2 rounded-full bg-cyan-500/[0.08] blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-[360px] w-[420px] rounded-full bg-indigo-500/[0.08] blur-3xl" />
        <div className="absolute -right-20 top-1/3 h-[320px] w-[380px] rounded-full bg-sky-500/[0.06] blur-3xl" />
      </div>

      <form
        onSubmit={submit}
        className="relative w-full max-w-[560px] overflow-hidden rounded-3xl border border-cyan-300/20 bg-[#07101a]/92 p-7 shadow-[0_40px_90px_rgba(0,0,0,0.7)] backdrop-blur-xl"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />

        <p className="font-mono text-[10px] tracking-[0.28em] text-cyan-200/70 uppercase">
          ReGrid Account
        </p>
        <h2 className="mt-2 text-[36px] leading-[1.05] font-semibold tracking-tight text-white">
          Log in
        </h2>
        <p className="mt-2 max-w-[460px] text-[15px] leading-relaxed text-white/55">
          Use any email + password. This v1 stores dashboard history locally in your browser.
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
          <div className="flex justify-center">
            <div ref={googleBtnRef} />
          </div>
          <button
            type="button"
            onClick={loginGoogle}
            className="mt-3 w-full rounded-xl border border-white/15 bg-white/[0.04] py-2.5 text-xs font-semibold tracking-wide text-white/90 transition hover:bg-white/[0.08]"
          >
            {googleReady ? "Open Google One Tap" : "Retry Google Sign-In"}
          </button>
        </div>

        <p
          className={`mt-2 text-center text-[11px] ${
            googleConfigured ? "text-emerald-300/70" : "text-amber-200/70"
          }`}
        >
          {googleConfigured
            ? "Google sign-in configured"
            : "Google sign-in not configured (set VITE_GOOGLE_CLIENT_ID)"}
        </p>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <p className="text-center font-mono text-[10px] tracking-[0.2em] text-white/28 uppercase">
            Or use email
          </p>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <label className="block text-[12px] font-medium text-white/62">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-[15px] text-white outline-none transition focus:border-cyan-300/50"
          placeholder="you@example.com"
        />
        <label className="mt-4 block text-[12px] font-medium text-white/62">Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-[15px] text-white outline-none transition focus:border-cyan-300/50"
          placeholder="••••••••"
        />

        {error ? (
          <p className="mt-3 rounded-lg border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="mt-5 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-400 py-3 text-[15px] font-semibold text-[#04121b] shadow-[0_14px_30px_rgba(56,189,248,0.34)] transition hover:brightness-110"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
