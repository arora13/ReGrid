import { motion } from "framer-motion";
import type { ProjectKind } from "@/lib/regrid/types";

export const WORKSPACE_PROJECT_LABEL: Record<ProjectKind, string> = {
  solar: "Vineyard Wind / proposal 04-C",
  battery: "Grid-scale storage / proposal 02-B",
  "grid-tied": "Central Valley solar / proposal 07-A",
};

export function workspaceProjectLabel(kind: ProjectKind): string {
  return WORKSPACE_PROJECT_LABEL[kind];
}

interface WorkspaceHeaderProps {
  projectKind: ProjectKind;
}

export function WorkspaceHeader({ projectKind }: WorkspaceHeaderProps) {
  return (
    <header className="relative z-40 flex h-[54px] shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#040810]/95 px-4 backdrop-blur-xl">
      {/* Decorative layers */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-indigo-400/15 to-transparent" />
        <div className="absolute -left-12 top-0 h-14 w-48 bg-cyan-400/8 blur-3xl" />
        <div className="absolute right-24 top-0 h-14 w-48 bg-indigo-500/6 blur-3xl" />
      </div>

      {/* Left: Logo + Project */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative flex min-w-0 items-center gap-3"
      >
        {/* Logo mark */}
        <div className="relative flex h-[30px] w-[30px] shrink-0 items-center justify-center">
          <div className="absolute inset-0 rounded-[8px] bg-gradient-to-br from-cyan-400/25 to-indigo-500/15 blur-md" />
          <div className="relative flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-cyan-300/20 bg-gradient-to-br from-[#0e2030] to-[#091628]">
            <svg viewBox="0 0 24 24" className="h-[15px] w-[15px] text-cyan-300" fill="currentColor">
              <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.3L18.5 8 12 11.7 5.5 8 12 4.3zM5 9.7l6 3.45V20l-6-3.33V9.7zm14 7l-6 3.33v-6.85l6-3.45v6.97z" />
            </svg>
          </div>
        </div>

        {/* Brand + project */}
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="bg-gradient-to-r from-cyan-100 via-sky-100 to-indigo-200 bg-clip-text text-[14px] font-semibold tracking-tight text-transparent">
            ReGrid
          </span>
          <span className="hidden h-3 w-px shrink-0 bg-white/12 sm:block" />
          <span className="hidden min-w-0 truncate text-[11.5px] font-normal text-[#6a8aaa] sm:block">
            {WORKSPACE_PROJECT_LABEL[projectKind]}
          </span>
        </div>
      </motion.div>

      {/* Right: status + actions */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
        className="relative flex shrink-0 items-center gap-3"
      >
        {/* Live sync indicator */}
        <div className="hidden items-center gap-1.5 sm:flex">
          <span className="relative flex h-[7px] w-[7px]">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-emerald-400" />
          </span>
          <span className="text-[10px] font-semibold tracking-[0.14em] text-emerald-300/70 uppercase">
            Live
          </span>
          <span className="text-[10px] text-white/20">·</span>
          <span className="text-[10px] font-normal text-slate-600">2m ago</span>
        </div>

        <div className="hidden h-4 w-px bg-white/[0.07] sm:block" />

        <button
          type="button"
          className="rounded-md border border-cyan-300/15 bg-cyan-500/8 px-3 py-1.5 text-[11px] font-semibold text-cyan-100/75 transition-all duration-150 hover:border-cyan-300/30 hover:bg-cyan-500/14 hover:text-cyan-50"
        >
          Share
        </button>
        <button
          type="button"
          className="rounded-md border border-blue-300/15 bg-blue-500/8 px-3 py-1.5 text-[11px] font-semibold text-blue-100/75 transition-all duration-150 hover:border-blue-300/30 hover:bg-blue-500/14 hover:text-blue-50"
        >
          Export
        </button>
      </motion.div>
    </header>
  );
}
