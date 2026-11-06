import type { Phase } from "@/lib/types";
import { cn } from "@/lib/utils";

const PHASE_NAME: Record<Phase, string> = {
  P1: "Phase 1",
  P2: "Planned for Phase 2",
  P3: "Planned for Phase 3",
};

export function PhaseBadge({ phase, className }: { phase: Phase; className?: string }) {
  return (
    <span
      title={PHASE_NAME[phase]}
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded border border-border bg-muted px-1.5 text-[11px] font-medium text-muted-foreground",
        className,
      )}
    >
      {phase}
    </span>
  );
}
