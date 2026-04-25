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
    <header className="relative z-40 flex h-[48px] shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0a0e14] px-4">
      <div className="min-w-0">
        <h1 className="truncate text-[14px] font-medium tracking-[-0.01em] text-white">
          <span className="font-semibold">ReGrid</span>
          <span className="mx-2 font-light text-[#94a3b8]">|</span>
          <span className="font-normal text-[#cbd5e1]">{WORKSPACE_PROJECT_LABEL[projectKind]}</span>
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden text-[11px] font-medium tracking-wide text-[#94a3b8] sm:inline">
          SAVED <span className="font-normal text-[#64748b]">2m ago</span>
        </span>
        <button
          type="button"
          className="rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-white/[0.07]"
        >
          Share
        </button>
        <button
          type="button"
          className="rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-white/[0.07]"
        >
          Export
        </button>
      </div>
    </header>
  );
}
