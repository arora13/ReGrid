import { motion } from "framer-motion";
import type { ProjectKind } from "@/lib/regrid/types";

export const WORKSPACE_PROJECT_LABEL: Record<ProjectKind, string> = {
  solar: "Solar siting workspace",
  battery: "Battery siting workspace",
  "grid-tied": "Grid-tied siting workspace",
};

export function workspaceProjectLabel(kind: ProjectKind): string {
  return WORKSPACE_PROJECT_LABEL[kind];
}

interface WorkspaceHeaderProps {
  projectKind: ProjectKind;
  onShare?: () => void;
  onExport?: () => void;
  sessionEmail?: string | null;
  onSignIn?: () => void;
  onAvatarClick?: () => void;
}

export function WorkspaceHeader({
  projectKind,
  onShare,
  onExport,
  sessionEmail,
  onSignIn,
  onAvatarClick,
}: WorkspaceHeaderProps) {
  const initials = sessionEmail ? sessionEmail.slice(0, 2).toUpperCase() : null;

  return (
    <header className="relative z-40 flex h-[48px] shrink-0 items-center justify-between bg-gradient-to-b from-black/55 to-transparent px-5">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="flex items-center gap-3"
      >
        <h1 className="map-text select-none text-[15px] tracking-[-0.01em]">
          <span className="font-light italic text-white/45">Re</span>
          <span className="font-bold text-white">Grid</span>
        </h1>
        <span className="text-[13px] font-light text-white/15">|</span>
        <span className="map-text hidden text-[12px] font-light tracking-wide text-white/35 sm:block">
          {WORKSPACE_PROJECT_LABEL[projectKind]}
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="flex shrink-0 items-center gap-3"
      >
        {/* Live indicator */}
        <div className="hidden items-center gap-1.5 sm:flex">
          <span className="relative flex h-[6px] w-[6px]">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/40 opacity-60" />
            <span className="relative inline-flex h-[6px] w-[6px] rounded-full bg-white/50" />
          </span>
          <span className="map-text font-mono text-[9.5px] tracking-[0.2em] text-white/25 uppercase">
            Live
          </span>
        </div>

        <button
          type="button"
          onClick={onShare}
          className="map-text text-[12.5px] font-medium text-white/30 transition duration-150 hover:text-white/65"
        >
          Share
        </button>
        <button
          type="button"
          onClick={onExport}
          className="map-text text-[12.5px] font-medium text-white/30 transition duration-150 hover:text-white/65"
        >
          Export
        </button>

        {/* Account button */}
        {sessionEmail ? (
          <button
            type="button"
            onClick={onAvatarClick}
            title={sessionEmail}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/70 transition hover:bg-white/18 hover:text-white"
          >
            {initials}
          </button>
        ) : (
          <button
            type="button"
            onClick={onSignIn}
            className="map-text rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11.5px] font-medium text-white/40 transition hover:border-white/18 hover:bg-white/[0.08] hover:text-white/70"
          >
            Sign in
          </button>
        )}
      </motion.div>
    </header>
  );
}
