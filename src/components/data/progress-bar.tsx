import type { Progress } from "@/lib/types";
import { cn } from "@/lib/utils";

/** A thin meter. `showLabel` adds "12 of 20" and the percent beneath it. */
export function ProgressBar({
  progress,
  label,
  showLabel = false,
  className,
}: {
  progress: Progress;
  /** Accessible name for what is being measured. */
  label: string;
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        className="h-1.5 w-full overflow-hidden rounded-full bg-[#dfe9f6]"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${progress.percent}%` }} />
      </div>
      {showLabel ? (
        <p className="flex justify-between text-xs text-muted-foreground">
          <span>{progress.completed} of {progress.total}</span>
          <span>{progress.percent}%</span>
        </p>
      ) : null}
    </div>
  );
}
