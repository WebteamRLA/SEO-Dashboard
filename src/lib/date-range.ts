import { instantDay, isCalendarDate } from "@/lib/format";
import type { ISODate, MonthKey } from "@/lib/types";

/**
 * The global reporting period. Pure and tested; all dates are UTC calendar
 * dates (YYYY-MM-DD), and a range includes both ends.
 */

export const RANGE_PRESETS = [
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "last-7-days", label: "Last 7 days" },
  { id: "last-30-days", label: "Last 30 days" },
  { id: "last-90-days", label: "Last 90 days" },
  { id: "this-quarter", label: "This quarter" },
  { id: "year-to-date", label: "Year to date" },
] as const;

export type RangePreset = (typeof RANGE_PRESETS)[number]["id"];
export const DEFAULT_PRESET: RangePreset = "this-month";

export interface DateRange {
  from: ISODate;
  to: ISODate;
}

export interface Period {
  range: DateRange;
  preset: RangePreset | "custom";
}

/** A sanity cap on custom ranges taken from the URL. */
const MAX_SPAN_DAYS = 3 * 366;
const DAY_MS = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parse(value: string): Date | null {
  if (!ISO_DATE.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  // Reject dates that roll over, such as 2026-02-31.
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

const iso = (date: Date): ISODate => date.toISOString().slice(0, 10);

function utc(year: number, monthIndex: number, day: number): ISODate {
  return iso(new Date(Date.UTC(year, monthIndex, day)));
}

export function addDays(date: ISODate, days: number): ISODate {
  return iso(new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS));
}

export function isPreset(value: unknown): value is RangePreset {
  return RANGE_PRESETS.some((preset) => preset.id === value);
}

export function presetRange(preset: RangePreset, today: ISODate): DateRange {
  const [y, m] = today.split("-").map(Number) as [number, number];
  switch (preset) {
    case "this-month":
      return { from: utc(y, m - 1, 1), to: today };
    case "last-month":
      return { from: utc(y, m - 2, 1), to: utc(y, m - 1, 0) };
    case "last-7-days":
      return { from: addDays(today, -6), to: today };
    case "last-30-days":
      return { from: addDays(today, -29), to: today };
    case "last-90-days":
      return { from: addDays(today, -89), to: today };
    case "this-quarter":
      return { from: utc(y, Math.floor((m - 1) / 3) * 3, 1), to: today };
    case "year-to-date":
      return { from: utc(y, 0, 1), to: today };
  }
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * Reads the period from URL parameters, which are untrusted: anything invalid
 * falls back to the default preset. Accepts `?range=<preset>`, a custom
 * `?from=&to=`, and the older `?month=YYYY-MM` so existing links keep working.
 */
export function resolvePeriod(
  params: { range?: string | string[]; from?: string | string[]; to?: string | string[]; month?: string | string[] },
  today: ISODate,
): Period {
  const range = first(params.range);
  if (isPreset(range)) return { preset: range, range: presetRange(range, today) };

  const from = first(params.from);
  const to = first(params.to);
  if (from && to) {
    const start = parse(from);
    const end = parse(to);
    if (start && end && start <= end && (end.getTime() - start.getTime()) / DAY_MS <= MAX_SPAN_DAYS) {
      return { preset: "custom", range: { from, to } };
    }
  }

  const month = first(params.month);
  if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    const [y, m] = month.split("-").map(Number) as [number, number];
    return { preset: "custom", range: { from: utc(y, m - 1, 1), to: utc(y, m, 0) } };
  }

  return { preset: DEFAULT_PRESET, range: presetRange(DEFAULT_PRESET, today) };
}

/** URL parameters for a period: the preset name, or the custom dates. */
export function periodParams(period: Period): Record<string, string> {
  return period.preset === "custom"
    ? { from: period.range.from, to: period.range.to }
    : { range: period.preset };
}

/** Whether a date or timestamp falls inside the range. Null never does. */
export function isWithin(value: string | null | undefined, range: DateRange): boolean {
  if (!value) return false;
  // A timestamp counts on its reporting-zone day, a calendar date on itself.
  const day = isCalendarDate(value.slice(0, 10)) && value.length <= 10 ? value : instantDay(value);
  return day >= range.from && day <= range.to;
}

/** Every calendar month the range touches, oldest first. For monthly data. */
export function monthsInRange(range: DateRange): MonthKey[] {
  const months: MonthKey[] = [];
  let [y, m] = range.from.split("-").map(Number) as [number, number];
  const last = range.to.slice(0, 7);
  for (;;) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    months.push(key);
    if (key >= last) return months;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
}

export function rangeDays(range: DateRange): number {
  return Math.round((Date.parse(range.to) - Date.parse(range.from)) / DAY_MS) + 1;
}

/** The period of the same length that ends the day before this one starts. */
export function previousRange(range: DateRange): DateRange {
  const days = rangeDays(range);
  return { from: addDays(range.from, -days), to: addDays(range.from, -1) };
}

const dayMonth = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const dayOnly = new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "UTC" });

function asDate(value: ISODate): Date {
  return new Date(`${value}T00:00:00Z`);
}

/** "Nov 1 – 10, 2026", "Oct 3 – Nov 10, 2026", "Dec 20, 2025 – Jan 5, 2026", "Nov 10, 2026". */
export function formatRange({ from, to }: DateRange): string {
  const [fy, fm] = [from.slice(0, 4), from.slice(5, 7)];
  const [ty, tm] = [to.slice(0, 4), to.slice(5, 7)];
  const start = asDate(from);
  const end = asDate(to);
  if (from === to) return `${dayMonth.format(start)}, ${fy}`;
  if (fy !== ty) return `${dayMonth.format(start)}, ${fy} – ${dayMonth.format(end)}, ${ty}`;
  if (fm === tm) return `${dayMonth.format(start)} – ${dayOnly.format(end)}, ${ty}`;
  return `${dayMonth.format(start)} – ${dayMonth.format(end)}, ${ty}`;
}

/** A short name for the period: the preset's label, or the formatted dates. */
export function periodLabel(period: Period): string {
  if (period.preset === "custom") return formatRange(period.range);
  return RANGE_PRESETS.find((preset) => preset.id === period.preset)?.label ?? formatRange(period.range);
}

/** For page subtitles: "This month · Nov 1 – 10, 2026", or just the dates for a custom range. */
export function describePeriod(period: Period): string {
  return period.preset === "custom" ? formatRange(period.range) : `${periodLabel(period)} · ${formatRange(period.range)}`;
}

const shortMonth = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });

/** "Nov 2026", "Oct – Nov 2026", or "Dec 2025 – Jan 2026" for months in order. */
export function formatMonthSpan(months: readonly MonthKey[]): string {
  const first = months[0];
  const last = months[months.length - 1];
  if (!first || !last) return "";
  const name = (month: MonthKey) => shortMonth.format(new Date(`${month}-01T00:00:00Z`));
  const withYear = (month: MonthKey) => `${name(month)} ${month.slice(0, 4)}`;
  if (first === last) return withYear(first);
  if (first.slice(0, 4) === last.slice(0, 4)) return `${name(first)} – ${withYear(last)}`;
  return `${withYear(first)} – ${withYear(last)}`;
}
