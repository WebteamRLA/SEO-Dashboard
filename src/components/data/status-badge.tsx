import type { StatusTone } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONE_CLASS: Record<StatusTone, string> = {
  good: "bg-status-good",
  warning: "bg-status-warning",
  serious: "bg-status-serious",
  critical: "bg-status-critical",
  info: "bg-status-info",
  neutral: "bg-status-neutral",
};

/** A status is always a coloured dot plus a text label, never colour alone. */
export function StatusBadge({
  tone,
  label,
  className,
}: {
  tone: StatusTone;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-md border border-border bg-card px-2 text-xs font-medium whitespace-nowrap text-foreground",
        className,
      )}
    >
      <span className={cn("size-2 shrink-0 rounded-full", TONE_CLASS[tone])} aria-hidden />
      {label}
    </span>
  );
}
