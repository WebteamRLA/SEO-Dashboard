export interface RankedBar {
  label: string;
  value: number;
  /** Text shown at the end of the row. Defaults to the raw value. */
  display?: string;
  /** Quiet text after the value, such as a share ("13%"). */
  secondary?: string;
  /** Grey bar for rows outside the highlighted group ("Other" channels). */
  muted?: boolean;
}

/**
 * Ranked horizontal bars on a grey track, for comparing categories such as lead
 * sources. Used instead of a donut: close values are far easier to compare
 * along one baseline. Highlighted rows are blue, the rest grey.
 */
export function RankedBars({ rows, label, labelWidth = 110 }: { rows: RankedBar[]; label: string; labelWidth?: number }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  const withSecondary = rows.some((row) => row.secondary);
  return (
    <ul className="flex flex-col gap-3.5" aria-label={label}>
      {rows.map((row) => (
        <li
          key={row.label}
          className="grid items-center gap-2.5"
          style={{
            gridTemplateColumns: `minmax(0, ${labelWidth}px) minmax(0, 1fr) auto${withSecondary ? " 3rem" : ""}`,
          }}
        >
          <span className="truncate text-[13px] text-ink-body" title={row.label}>{row.label}</span>
          <span className="h-2 min-w-0 rounded bg-bar-track">
            <span
              className={row.muted ? "block h-full rounded bg-bar-muted" : "block h-full rounded bg-bar"}
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </span>
          <span className="min-w-7 text-right text-[13px] font-semibold tabular-nums">{row.display ?? row.value}</span>
          {withSecondary ? (
            <span className="text-right text-xs text-ink-quiet tabular-nums">{row.secondary ?? ""}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
