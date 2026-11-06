import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A labelled figure. Pass `footer` for context such as a progress bar. */
export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  footer,
  className,
}: {
  label: string;
  value: string;
  detail?: string;
  icon?: LucideIcon;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-lg border border-border bg-card p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm text-muted-foreground">{label}</p>
        {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
      </div>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      {detail ? <p className="truncate text-xs text-muted-foreground">{detail}</p> : null}
      {footer ? <div className="mt-1.5">{footer}</div> : null}
    </div>
  );
}

/** Responsive grid for a row of metric cards. */
export function MetricGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {children}
    </div>
  );
}
