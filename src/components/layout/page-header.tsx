import type { ReactNode } from "react";
import { PhaseBadge } from "@/components/data/phase-badge";
import type { Phase } from "@/lib/types";

/** The top of every page. `phase` marks work that is not delivered yet. */
export function PageHeader({
  title,
  description,
  phase,
  actions,
}: {
  title: string;
  description?: string;
  phase?: Phase;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {phase ? <PhaseBadge phase={phase} /> : null}
        </div>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Standard vertical rhythm for a page's sections. */
export function PageBody({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-5">{children}</div>;
}
