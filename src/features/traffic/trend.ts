import type { ChartDatum } from "@/components/charts/charts";
import type { ChartTableData } from "@/components/charts/chart-card";
import { formatMonthShort } from "@/lib/format";
import type { MonthKey } from "@/lib/types";

export const COMPLETE_MONTHS_NOTE = "Complete months only";


/** The row for the month before `month`, if both exist. Rows must be in month order. */
export function findPrior<T extends { month: MonthKey }>(rows: readonly T[], month: MonthKey): T | undefined {
  const index = rows.findIndex((row) => row.month === month);
  return index > 0 ? rows[index - 1] : undefined;
}

export type ChangeKind = "percent" | "points" | "position";

/**
 * Plain-language change versus the prior month. Position is lower-is-better,
 * so a smaller number reads as "Improved". Returns undefined when there is
 * nothing sensible to compare against.
 */
export function describeChange(
  kind: ChangeKind,
  current: number,
  prior: number | undefined,
  priorLabel: string,
): string | undefined {
  if (prior === undefined) return undefined;
  if (kind === "position") {
    const gain = Math.round((prior - current) * 10) / 10;
    if (gain > 0) return `Improved by ${gain.toFixed(1)} vs ${priorLabel}`;
    if (gain < 0) return `Worsened by ${Math.abs(gain).toFixed(1)} vs ${priorLabel}`;
    return `No change vs ${priorLabel}`;
  }
  if (kind === "points") {
    const diff = Math.round((current - prior) * 10) / 10;
    if (diff === 0) return `No change vs ${priorLabel}`;
    return `${diff > 0 ? "Up" : "Down"} ${Math.abs(diff).toFixed(1)} points vs ${priorLabel}`;
  }
  if (prior === 0) return undefined;
  const pct = Math.round(((current - prior) / prior) * 1000) / 10;
  if (pct === 0) return `No change vs ${priorLabel}`;
  return `${pct > 0 ? "Up" : "Down"} ${Math.abs(pct).toFixed(1)}% vs ${priorLabel}`;
}

/** One chart datum per month, labelled with the short month name. */
export function toChartData<T extends { month: MonthKey }>(
  rows: readonly T[],
  pick: (row: T) => Record<string, number>,
): ChartDatum[] {
  return rows.map((row) => ({ label: formatMonthShort(row.month), ...pick(row) }));
}

/** Table view of a single-value monthly series. */
export function toMonthTable<T extends { month: MonthKey }>(
  rows: readonly T[],
  column: string,
  value: (row: T) => string,
): ChartTableData {
  return {
    columns: ["Month", column],
    rows: rows.map((row) => ({ key: row.month, cells: [formatMonthShort(row.month), value(row)] })),
  };
}
