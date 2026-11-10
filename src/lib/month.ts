import { instantMonthKey, isCalendarDate } from "@/lib/format";
import type { MonthKey } from "@/lib/types";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonthKey(value: unknown): value is MonthKey {
  return typeof value === "string" && MONTH_PATTERN.test(value);
}


/**
 * The month of an ISO date or timestamp. A calendar date keeps its own month; a
 * timestamp takes its month in the reporting time zone, so a lead sent late on
 * the last day of a month counts in that month.
 */
export function toMonthKey(isoDate: string): MonthKey {
  return isoDate.length <= 7 || isCalendarDate(isoDate) ? isoDate.slice(0, 7) : instantMonthKey(isoDate);
}

/**
 * Drops the month still in progress. Plotting a few days beside full months
 * reads as a collapse, which no caption reliably corrects.
 */
export function completeMonths<T extends { month: MonthKey }>(rows: readonly T[], inProgressMonth: MonthKey): T[] {
  return rows.filter((row) => row.month !== inProgressMonth);
}
