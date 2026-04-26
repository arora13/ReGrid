import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, BarChart3, Zap } from "lucide-react";
import { getUserActivity, logoutUser, type UserActivity } from "@/lib/regrid/user-store";

interface UserDashboardProps {
  email: string;
  onLogout: () => void;
  onClose: () => void;
  /** Increment to force a refresh from localStorage */
  refreshKey?: number;
}

function timeAgo(ts: number): string {
  const d = Date.now() - ts;
  if (d < 60_000) return "just now";
  if (d < 3_600_000) return `${Math.round(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.round(d / 3_600_000)}h ago`;
  return `${Math.round(d / 86_400_000)}d ago`;
}

const TYPE_ICON: Record<UserActivity["type"], React.ReactNode> = {
  search: <Search className="h-3 w-3" />,
  analysis: <BarChart3 className="h-3 w-3" />,
  optimize: <Zap className="h-3 w-3" />,
};

const TYPE_COLOR: Record<UserActivity["type"], string> = {
  search: "text-sky-300/70",
  analysis: "text-amber-300/70",
  optimize: "text-emerald-300/70",
};

export function UserDashboard({ email, onLogout, onClose, refreshKey }: UserDashboardProps) {
  // Read directly from localStorage so the list is always fresh
  const [activity, setActivity] = useState<UserActivity[]>(() => getUserActivity(email));

  // Re-read whenever refreshKey changes (parent triggers after new activity)
  useEffect(() => {
    setActivity(getUserActivity(email));
  }, [email, refreshKey]);

  const initials = email.slice(0, 2).toUpperCase();

  return (
    <motion.aside
      initial={{ opacity: 0, x: 10, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 10, scale: 0.98 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="pointer-events-auto absolute right-4 top-14 z-40 w-[min(340px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-white/[0.09] bg-[#07101c]/96 shadow-[0_24px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl"
    >
      {/* Top accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3.5">
        {/* Avatar */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-white/70">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-medium text-white/75">{email}</p>
          <p className="text-[10px] text-white/30">{activity.length} recorded actions</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => { logoutUser(); onLogout(); }}
            className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/45 transition hover:bg-white/[0.09] hover:text-white/75"
          >
            Log out
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/25 transition hover:bg-white/[0.06] hover:text-white/55"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Activity list */}
      <div className="px-4 py-3">
        <p className="mb-2.5 text-[10px] font-medium tracking-wide text-white/30 uppercase">
          Recent activity
        </p>
        <ul className="max-h-[40vh] space-y-1.5 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {activity.length === 0 ? (
              <li className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-center text-[12px] text-white/28">
                No activity yet — run a search or analysis.
              </li>
            ) : (
              activity.map((a) => (
                <motion.li
                  key={a.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className={`flex items-center gap-1.5 ${TYPE_COLOR[a.type]}`}>
                      {TYPE_ICON[a.type]}
                      <span className="text-[10px] font-semibold uppercase tracking-wide">
                        {a.type}
                      </span>
                    </div>
                    <span className="text-[10px] text-white/28">{timeAgo(a.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-[12px] leading-snug text-white/62">{a.text}</p>
                  {typeof a.score === "number" && (
                    <p className="mt-1 text-[11px] font-medium text-amber-300/75">
                      Score: {a.score} / 100
                    </p>
                  )}
                </motion.li>
              ))
            )}
          </AnimatePresence>
        </ul>
      </div>
    </motion.aside>
  );
}
