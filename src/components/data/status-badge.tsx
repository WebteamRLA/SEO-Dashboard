import type { StatusTone } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONE_CLASS: Record<StatusTone, { pill: string; dot: string }> = {
  good: { pill: "bg-tone-good-bg text-tone-good-fg", dot: "bg-status-good" },
  warning: { pill: "bg-tone-warning-bg text-tone-warning-fg", dot: "bg-status-warning" },
  serious: { pill: "bg-tone-serious-bg text-tone-serious-fg", dot: "bg-status-serious" },
  critical: { pill: "bg-tone-critical-bg text-tone-critical-fg", dot: "bg-status-critical" },
  info: { pill: "bg-tone-info-bg text-tone-info-fg", dot: "bg-status-info" },
  neutral: { pill: "bg-tone-neutral-bg text-tone-neutral-fg", dot: "bg-status-neutral" },
};

/**
 * A status is a soft pill with a dot and a text label, never colour alone.
 * `variant="tag"` drops the dot and squares the corners, for priorities.
 */
export function StatusBadge({
  tone,
  label,
  variant = "pill",
  className,
}: {
  tone: StatusTone;
  label: string;
  variant?: "pill" | "tag";
  className?: string;
}) {
  const classes = TONE_CLASS[tone];
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 text-xs font-semibold whitespace-nowrap",
        variant === "pill" ? "rounded-full px-2.5" : "rounded px-2",
        classes.pill,
        className,
      )}
    >
      {variant === "pill" ? <span className={cn("size-1.5 shrink-0 rounded-full", classes.dot)} aria-hidden /> : null}
      {label}
    </span>
  );
}

/** A grey category chip, such as a task's "Content" or "Technical SEO". */
export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-full shrink-0 items-center truncate rounded-md bg-tone-neutral-bg px-2 text-xs font-medium whitespace-nowrap text-ink-body",
        className,
      )}
    >
      {children}
    </span>
  );
}
