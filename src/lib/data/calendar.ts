import "server-only";
import { ACTIVE_MONTHS, DEFAULT_MONTH, REFERENCE_DATE, STRATEGY_MONTHS } from "@/mocks/calendar";
import { pickMonth } from "@/lib/month";
import type { ISODate, MonthKey } from "@/lib/types";

export async function getAvailableMonths(): Promise<MonthKey[]> {
  return ACTIVE_MONTHS;
}

export async function getStrategyMonths(): Promise<MonthKey[]> {
  return STRATEGY_MONTHS;
}

export async function getDefaultMonth(): Promise<MonthKey> {
  return DEFAULT_MONTH;
}

/** "Today" for relative filters. Becomes the real clock with live data. */
export async function getReferenceDate(): Promise<ISODate> {
  return REFERENCE_DATE;
}

/** Validates a page's `?month=` search parameter. */
export async function resolveMonth(raw: string | string[] | undefined): Promise<MonthKey> {
  return pickMonth(raw, ACTIVE_MONTHS, DEFAULT_MONTH);
}
