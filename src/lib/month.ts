import type { MonthKey } from "@/lib/types";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonthKey(value: unknown): value is MonthKey {
  return typeof value === "string" && MONTH_PATTERN.test(value);
}

/**
 * Resolves the `?month=` URL parameter. The URL is untrusted input, so anything
 * that is not a known month falls back rather than reaching a query or a chart.
 */
export function pickMonth(
  raw: string | string[] | null | undefined,
  available: readonly MonthKey[],
  fallback: MonthKey,
): MonthKey {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return isMonthKey(value) && available.includes(value) ? value : fallback;
}

/** The `YYYY-MM` portion of an ISO date or timestamp. */
export function toMonthKey(isoDate: string): MonthKey {
  return isoDate.slice(0, 7);
}

/**
 * Drops the month still in progress. Plotting a few days beside full months
 * reads as a collapse, which no caption reliably corrects.
 */
export function completeMonths<T extends { month: MonthKey }>(rows: readonly T[], inProgressMonth: MonthKey): T[] {
  return rows.filter((row) => row.month !== inProgressMonth);
}
