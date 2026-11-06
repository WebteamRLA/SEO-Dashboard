export interface RankedBar {
  label: string;
  value: number;
  /** Text shown at the end of the row. Defaults to the raw value. */
  display?: string;
}

/**
 * Ranked horizontal bars for comparing categories, such as lead sources. Used
 * instead of a donut: close values are far easier to compare along one baseline.
 * One series, so every bar shares slot 1.
 */
export function RankedBars({ rows, label }: { rows: RankedBar[]; label: string }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <ul className="flex flex-col gap-2.5" aria-label={label}>
      {rows.map((row) => (
        <li key={row.label} className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-2.5 text-sm">
          <span className="truncate text-muted-foreground" title={row.label}>{row.label}</span>
          <span className="h-3 min-w-0 rounded-r bg-transparent">
            <span
              className="block h-full rounded-r bg-[var(--series-1)]"
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </span>
          <span className="font-medium tabular-nums">{row.display ?? row.value}</span>
        </li>
      ))}
    </ul>
  );
}
