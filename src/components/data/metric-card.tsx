import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The tile outline hints at what the figure is about: traffic, leads, money, or neutral. */
export type TileTone = "blue" | "green" | "amber" | "neutral";

const TONE_BORDER: Record<TileTone, string> = {
  blue: "border-[var(--tile-blue)]",
  green: "border-[var(--tile-green)]",
  amber: "border-[var(--tile-amber)]",
  neutral: "border-[var(--tile-neutral)]",
};

/**
 * A change against the previous period. `good` says whether the move is an
 * improvement (a lower average position is good, for example); it defaults to
 * "up is good".
 */
export interface MetricDelta {
  text: string;
  direction: "up" | "down" | "flat";
  good?: boolean;
}

export function DeltaIndicator({ delta }: { delta: MetricDelta }) {
  if (delta.direction === "flat") return <span className="font-medium text-ink-body">{delta.text}</span>;
  const good = delta.good ?? delta.direction === "up";
  return (
    <span className={cn("inline-flex items-center gap-[3px] font-semibold tabular-nums", good ? "text-tone-good-fg" : "text-tone-critical-fg")}>
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden className={delta.direction === "down" ? "rotate-180" : undefined}>
        <path d="M5 1.5L9 8.5H1z" fill={good ? "#16A34A" : "#DC2626"} />
      </svg>
      <span className="sr-only">{delta.direction === "up" ? "Up" : "Down"} </span>
      {delta.text}
    </span>
  );
}

/**
 * A KPI tile: label, a large figure, and one line of context. `suffix` renders
 * quietly after the figure ("/50", "%"). `footer` sits between the figure and
 * the context line, for a progress bar. `icon` is accepted for older callers
 * but not drawn: the design's tiles carry no icons.
 */
export function MetricCard({
  label,
  value,
  suffix,
  detail,
  delta,
  tone = "neutral",
  footer,
  className,
}: {
  label: string;
  value: ReactNode;
  suffix?: string;
  detail?: ReactNode;
  delta?: MetricDelta;
  tone?: TileTone;
  icon?: LucideIcon;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5 rounded-xl border bg-card px-4 py-3.5 sm:px-5 sm:py-4", TONE_BORDER[tone], className)}>
      <p className="line-clamp-2 text-[13px] font-medium text-ink-quiet">{label}</p>
      <p className="truncate text-[22px] leading-[28px] font-semibold tracking-[-0.02em] tabular-nums sm:text-[26px] sm:leading-[30px]">
        {value}
        {suffix ? <span className="text-[15px] font-medium tracking-normal text-ink-quiet">{suffix}</span> : null}
      </p>
      {footer ? <div className="mt-0.5">{footer}</div> : null}
      {delta || detail ? (
        <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs leading-[18px] text-ink-quiet">
          {delta ? <DeltaIndicator delta={delta} /> : null}
          {detail ? <span className="line-clamp-2 min-w-0">{detail}</span> : null}
        </p>
      ) : null}
    </div>
  );
}

/** Row of KPI tiles. Tiles wrap at 200px, so three or four sit side by side on desktop. */
export function MetricGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]", className)}>
      {children}
    </div>
  );
}
