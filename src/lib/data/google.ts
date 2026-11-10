import "server-only";
import { requireSessionUser } from "@/server/auth/session";
import type { DateRange } from "@/lib/date-range";
import type { ISODate } from "@/lib/types";
import { fetchSearchTotals, fetchTrafficTotals } from "@/server/google/client";
import { GoogleConfigError } from "@/server/google/config";
import {
  reportWindow,
  type Comparison,
  type ReportWindow,
  type SearchTotals,
  type TrafficTotals,
} from "@/server/google/reports";

export type { SearchTotals, TrafficTotals } from "@/server/google/reports";

export type GoogleSource<T> =
  | { status: "ok"; data: Comparison<T> }
  /** Credentials or the property ID are not set; expected until access is granted. */
  | { status: "not-connected"; message: string }
  /** The period has no complete day yet, e.g. "This month" on the 1st. */
  | { status: "empty"; message: string }
  | { status: "error"; message: string };

export interface GoogleOverview {
  /** Null when the selected period has no complete day of data yet. */
  window: ReportWindow | null;
  search: GoogleSource<SearchTotals>;
  traffic: GoogleSource<TrafficTotals>;
}

async function load<T>(fetcher: () => Promise<Comparison<T>>): Promise<GoogleSource<T>> {
  try {
    return { status: "ok", data: await fetcher() };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load Google data.";
    if (error instanceof GoogleConfigError) return { status: "not-connected", message };
    console.error("Google report failed:", message);
    return { status: "error", message };
  }
}

/**
 * Search Console and GA4 totals for the selected period, each against the same
 * number of days before it. A source that fails or is not set up yet is
 * reported, never thrown, so the Overview still renders.
 */
export async function getGoogleOverview(range: DateRange, today: ISODate): Promise<GoogleOverview> {
  await requireSessionUser();
  const window = reportWindow(range, today);
  if (!window) {
    const empty = { status: "empty", message: "This period has no complete day of data yet." } as const;
    return { window: null, search: empty, traffic: empty };
  }
  const [search, traffic] = await Promise.all([
    load(() => fetchSearchTotals(window)),
    load(() => fetchTrafficTotals(window)),
  ]);
  return { window, search, traffic };
}
