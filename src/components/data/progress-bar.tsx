import type { Progress } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Green for work that is finished, blue for work still moving. */
export type ProgressTone = "good" | "info";

const FILL: Record<ProgressTone, string> = {
  good: "bg-status-good",
  info: "bg-bar",
};

/** A thin meter. `showLabel` adds "12 of 20" and the percent beneath it. */
export function ProgressBar({
  progress,
  label,
  showLabel = false,
  tone = "info",
  className,
}: {
  progress: Progress;
  /** Accessible name for what is being measured. */
  label: string;
  showLabel?: boolean;
  tone?: ProgressTone;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        className="h-1.5 w-full overflow-hidden rounded-[3px] bg-line"
      >
        <div className={cn("h-full rounded-[3px]", FILL[tone])} style={{ width: `${progress.percent}%` }} />
      </div>
      {showLabel ? (
        <p className="flex justify-between text-xs text-ink-quiet">
          <span>{progress.completed} of {progress.total}</span>
          <span>{progress.percent}%</span>
        </p>
      ) : null}
    </div>
  );
}
