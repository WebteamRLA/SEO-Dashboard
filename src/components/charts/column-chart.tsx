import { cn } from "@/lib/utils";

export interface ColumnDatum {
  /** Bucket name under the column, such as "Nov 1–7". */
  label: string;
  /** The main, solid part of the column. */
  value: number;
  /**
   * A lighter part stacked on top (open tasks above completed ones, other
   * channels above search). The number over the column is the total.
   */
  extra?: number;
  /** The bucket is still filling: drawn lighter, labelled "so far". */
  partial?: boolean;
  /** Text over the column. Defaults to the total. */
  display?: string;
}

/**
 * The design's column chart: a few labelled columns on a single baseline, the
 * value printed above each. Built for weekly or monthly buckets; with many
 * buckets it thins out the labels so they stay legible. The whole chart is one
 * image with a full text alternative.
 */
export function ColumnChart({
  data,
  label,
  height = 168,
  formatValue = (value) => value.toLocaleString("en-US"),
  className,
}: {
  data: ColumnDatum[];
  /** Accessible summary prefix, e.g. "Leads by week". Values are appended. */
  label: string;
  height?: number;
  formatValue?: (value: number) => string;
  className?: string;
}) {
  const totals = data.map((datum) => datum.value + (datum.extra ?? 0));
  const max = Math.max(...totals, 1);
  const dense = data.length > 12;
  const crowded = data.length > 6;
  const labelEvery = dense ? Math.ceil(data.length / 6) : 1;
  const summary = `${label}: ${data
    .map((datum, index) => `${datum.label} ${datum.display ?? formatValue(totals[index] ?? 0)}${datum.partial ? " so far" : ""}`)
    .join(", ")}`;

  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <div
        role="img"
        aria-label={summary}
        className="flex items-end gap-2 border-b border-line tabular-nums"
        style={{ height }}
      >
        {data.map((datum, index) => {
          const total = totals[index] ?? 0;
          // Leave room above the tallest column for its value.
          const scale = (value: number) => `${(value / max) * (height - 28)}px`;
          return (
            <div key={index} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" title={dense ? `${datum.label}: ${datum.display ?? formatValue(total)}` : undefined}>
              {dense ? null : (
                // With many columns the values would collide on a phone; the chart's text alternative keeps them.
                <span className={cn("text-xs font-semibold whitespace-nowrap text-ink-body", crowded && "hidden sm:inline")}>
                  {datum.display ?? formatValue(total)}
                </span>
              )}
              <div
                className={cn("flex w-full flex-col overflow-hidden rounded-t", dense ? "max-w-6" : "max-w-10")}
                style={{ height: scale(total), minHeight: total > 0 ? 2 : 0 }}
              >
                {datum.extra ? <div className="w-full bg-bar-light" style={{ height: scale(datum.extra) }} /> : null}
                <div className={cn("w-full flex-1", datum.partial ? "bg-[#7cc4ff]" : "bg-bar")} />
              </div>
            </div>
          );
        })}
      </div>
      <div aria-hidden className="mt-1.5 flex gap-2">
        {data.map((datum, index) => (
          <span
            key={index}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center text-center text-[11px] leading-[14px] text-ink-quiet",
              dense && "relative h-3.5",
            )}
          >
            {index % labelEvery !== 0 ? null : dense ? (
              // Sparse labels may be wider than their column: centre them on it and let them overflow.
              <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap">{datum.label}</span>
            ) : (
              <>
                <span className="max-w-full truncate whitespace-nowrap">{datum.label}</span>
                {datum.partial ? <span className="text-[10px] whitespace-nowrap">so far</span> : null}
              </>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
