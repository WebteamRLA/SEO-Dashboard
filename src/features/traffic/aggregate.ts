import { formatMonthSpan } from "@/lib/date-range";
import { formatMonthShort } from "@/lib/format";
import type { MonthKey, SearchMetrics, TrafficMetrics } from "@/lib/types";

export interface SearchTotals {
  clicks: number;
  impressions: number;
  /** Percent, one decimal. */
  ctr: number;
  /** Impression-weighted average of the monthly positions. */
  position: number;
}

export interface TrafficTotals {
  sessions: number;
  users: number;
  organicSessions: number;
  organicVisitors: number;
  referralSessions: number;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Rows for the given months, in the order the rows come. */
function pick<T extends { month: MonthKey }>(rows: readonly T[], months: readonly MonthKey[]): T[] {
  return rows.filter((row) => months.includes(row.month));
}

/** Totals over the months that have data, or undefined when none do. */
export function aggregateSearch(rows: readonly SearchMetrics[], months: readonly MonthKey[]): SearchTotals | undefined {
  const picked = pick(rows, months);
  if (picked.length === 0) return undefined;
  const clicks = picked.reduce((sum, row) => sum + row.clicks, 0);
  const impressions = picked.reduce((sum, row) => sum + row.impressions, 0);
  const weighted = picked.reduce((sum, row) => sum + row.position * row.impressions, 0);
  const meanPosition = picked.reduce((sum, row) => sum + row.position, 0) / picked.length;
  return {
    clicks,
    impressions,
    ctr: impressions === 0 ? 0 : round1((clicks / impressions) * 100),
    // With no impressions to weight by, fall back to the plain mean.
    position: impressions === 0 ? meanPosition : weighted / impressions,
  };
}

export function aggregateTraffic(rows: readonly TrafficMetrics[], months: readonly MonthKey[]): TrafficTotals | undefined {
  const picked = pick(rows, months);
  if (picked.length === 0) return undefined;
  const sum = (field: keyof Omit<TrafficMetrics, "month">) => picked.reduce((total, row) => total + row[field], 0);
  return {
    sessions: sum("sessions"),
    users: sum("users"),
    organicSessions: sum("organicSessions"),
    organicVisitors: sum("organicVisitors"),
    referralSessions: sum("referralSessions"),
  };
}


export const PRIOR_LABEL = "the previous period";

export function roundingNote(months: readonly MonthKey[]): string {
  return `Sample data is monthly, so this period is rounded to whole months: ${formatMonthSpan(months)}.`;
}
