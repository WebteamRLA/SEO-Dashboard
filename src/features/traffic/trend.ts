import type { ChartDatum } from "@/components/charts/charts";
import type { ChartTableData } from "@/components/charts/chart-card";
import { formatRange } from "@/lib/date-range";
import { formatDayShort, formatMonthShort, formatNumber } from "@/lib/format";
import type { ReportWindow } from "@/lib/data/google";
import type { TrendPoint } from "@/server/google/analytics";

export const PRIOR_LABEL = "the previous period";

/** Shown instead of a change when the source has nothing for the previous period (e.g. before it was set up). */
export const NO_PRIOR = "No data for the previous period";

export type ChangeKind = "percent" | "points" | "position";

/**
 * Plain-language change versus the previous period. Position is lower-is-better,
 * so a smaller number reads as "Improved". Returns undefined when there is
 * nothing sensible to compare against.
 */
export function describeChange(
  kind: ChangeKind,
  current: number | null,
  prior: number | null | undefined,
  priorLabel: string = PRIOR_LABEL,
): string | undefined {
  if (current === null || prior === null || prior === undefined) return undefined;
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

/** GA4 event name as words: "contact_page_form_submit" → "Contact page form submit". */
export function eventLabel(name: string): string {
  const words = name.replace(/[_-]+/g, " ").trim();
  return words ? words[0]!.toUpperCase() + words.slice(1) : name;
}

/** "Nov 3" for a daily point, "Nov" for a monthly one ("Nov 2025" when the chart spans years). */
export function pointLabel(point: TrendPoint, withYear = false): string {
  if (point.unit === "day") return formatDayShort(point.start);
  const month = formatMonthShort(point.start.slice(0, 7));
  return withYear ? `${month} ${point.start.slice(0, 4)}` : month;
}

/** Monthly charts that cross a year boundary need the year, or "Nov … Nov" is ambiguous. */
function spansYears(points: readonly TrendPoint[]): boolean {
  return points.length > 0 && points[0]!.start.slice(0, 4) !== points[points.length - 1]!.start.slice(0, 4);
}

/** Labeller for a whole series, adding the year only when it is needed. */
export function labeller(points: readonly TrendPoint[]): (point: TrendPoint) => string {
  const withYear = spansYears(points);
  return (point) => pointLabel(point, withYear);
}

/** The dates actually reported and what they are compared with. */
export function windowNote(window: ReportWindow): string {
  const days = `${formatNumber(window.days)} ${window.days === 1 ? "day" : "days"}`;
  return `${formatRange(window.current)} (${days}, through yesterday), compared with ${formatRange(window.previous)}.`;
}

export function trendDescription(points: readonly TrendPoint[]): string {
  return points[0]?.unit === "month" ? "By month" : "By day";
}

export function toTrendData<T extends TrendPoint>(points: readonly T[], pick: (point: T) => Record<string, number | null>): ChartDatum[] {
  const label = labeller(points);
  return points.map((point) => ({ label: label(point), ...pick(point) }));
}

export function toTrendTable<T extends TrendPoint>(points: readonly T[], column: string, value: (point: T) => string): ChartTableData {
  const label = labeller(points);
  return {
    columns: [points[0]?.unit === "month" ? "Month" : "Day", column],
    rows: points.map((point) => ({ key: point.start, cells: [label(point), value(point)] })),
  };
}
