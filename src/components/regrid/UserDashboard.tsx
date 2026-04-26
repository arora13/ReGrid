import type { UserActivity } from "@/lib/regrid/user-store";

interface UserDashboardProps {
  email: string;
  activity: UserActivity[];
  onLogout: () => void;
}

function when(ts: number): string {
  const d = Date.now() - ts;
  if (d < 60_000) return "just now";
  if (d < 3_600_000) return `${Math.round(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.round(d / 3_600_000)}h ago`;
  return `${Math.round(d / 86_400_000)}d ago`;
}

export function UserDashboard({ email, activity, onLogout }: UserDashboardProps) {
  return (
    <aside className="pointer-events-auto absolute right-5 top-20 z-40 w-[min(360px,calc(100vw-1.25rem))] rounded-2xl border border-cyan-300/15 bg-[#07101a]/88 p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/60">Dashboard</p>
          <p className="mt-1 truncate text-sm text-white/75">{email}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/75 hover:bg-white/10"
        >
          Log out
        </button>
      </div>
      <div className="mt-3 border-t border-white/10 pt-3">
        <p className="text-xs text-white/55">Recent searches & analysis</p>
        <ul className="mt-2 max-h-[34vh] space-y-2 overflow-y-auto pr-1">
          {activity.length === 0 ? (
            <li className="rounded-md border border-white/10 bg-black/20 px-2.5 py-2 text-xs text-white/40">
              No recent activity yet. Run a copilot query or analysis.
            </li>
          ) : (
            activity.map((a) => (
              <li key={a.id} className="rounded-md border border-white/10 bg-black/20 px-2.5 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] uppercase tracking-[0.12em] text-cyan-200/60">
                    {a.type}
                  </span>
                  <span className="text-[10px] text-white/35">{when(a.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs text-white/70">{a.text}</p>
                {typeof a.score === "number" ? (
                  <p className="mt-1 text-[11px] text-amber-200/80">Score: {a.score}/100</p>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </div>
    </aside>
  );
}
