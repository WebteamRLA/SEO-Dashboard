import "server-only";
import { requireSessionUser } from "@/server/auth/session";
import { ACTIVE_MONTHS, STRATEGY_MONTHS } from "@/mocks/calendar";
import { resolvePeriod, type Period } from "@/lib/date-range";
import { instantDay } from "@/lib/format";
import type { ISODate, MonthKey } from "@/lib/types";

export async function getAvailableMonths(): Promise<MonthKey[]> {
  await requireSessionUser();
  return ACTIVE_MONTHS;
}

export async function getStrategyMonths(): Promise<MonthKey[]> {
  await requireSessionUser();
  return STRATEGY_MONTHS;
}


/**
 * Today in the reporting time zone, from the real clock. Reporting periods are
 * relative to it, and isWithin() puts timestamps on the same zone's days, so the
 * two agree around midnight.
 */
export async function getToday(): Promise<ISODate> {
  await requireSessionUser();
  return instantDay(new Date().toISOString());
}


/** The reporting period from a page's search parameters. Untrusted input is validated. */
export async function resolvePagePeriod(params: {
  range?: string | string[];
  from?: string | string[];
  to?: string | string[];
  month?: string | string[];
}): Promise<Period> {
  await requireSessionUser();
  return resolvePeriod(params, await getToday());
}

