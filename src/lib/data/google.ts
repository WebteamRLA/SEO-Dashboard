import "server-only";
import { requireSessionUser } from "@/server/auth/session";
import type { DateRange } from "@/lib/date-range";
import type { ISODate } from "@/lib/types";
import {
  fetchBehavior,
  fetchSearchBreakdown,
  fetchSocialTraffic,
  fetchSearchTotals,
  fetchTrafficBreakdown,
  fetchTrafficOverview,
  fetchTrafficTotals,
  type SearchBreakdown,
} from "@/server/google/client";
import type { TrafficOverview } from "@/server/google/traffic-overview";
export type {
  TrafficChannel,
  TrafficLandingPage,
  TrafficOverview,
  TrafficOverviewDay,
  TrafficOverviewTotals,
} from "@/server/google/traffic-overview";
import type { TrafficBreakdown } from "@/server/google/analytics";
export type {
  BehaviorData,
  DeviceRow,
  EnquiryLandingPage,
  KeyEventRow,
  PageEngagement,
  SocialLandingPage,
  SocialPlatformRow,
  SocialTraffic,
} from "@/server/google/engagement";
import type { BehaviorData, SocialTraffic } from "@/server/google/engagement";
import { GoogleConfigError } from "@/server/google/config";
import {
  reportWindow,
  type Comparison,
  type ReportWindow,
  type SearchTotals,
  type TrafficTotals,
} from "@/server/google/reports";

export type { SearchTotals, TrafficTotals, ReportWindow } from "@/server/google/reports";
export type { SearchBreakdown } from "@/server/google/client";
export type {
  ChannelRow,
  KeywordRow,
  SearchDay,
  TrafficBreakdown,
  TrafficDay,
} from "@/server/google/analytics";

/** One Google source's data, or why it is not shown. Never thrown, so a page still renders. */
export type SourceResult<T> =
  | { status: "ok"; data: T }
  /** Credentials or the property ID are not set; expected until access is granted. */
  | { status: "not-connected"; message: string }
  /** The period has no complete day yet, e.g. "This month" on the 1st. */
  | { status: "empty"; message: string }
  | { status: "error"; message: string };

export type GoogleSource<T> = SourceResult<Comparison<T>>;

const EMPTY = { status: "empty", message: "This period has no complete day of data yet." } as const;

export interface GoogleOverview {
  /** Null when the selected period has no complete day of data yet. */
  window: ReportWindow | null;
  search: GoogleSource<SearchTotals>;
  traffic: GoogleSource<TrafficTotals>;
}

async function load<T>(fetcher: () => Promise<T>): Promise<SourceResult<T>> {
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
    return { window: null, search: EMPTY, traffic: EMPTY };
  }
  const [search, traffic] = await Promise.all([
    load(() => fetchSearchTotals(window)),
    load(() => fetchTrafficTotals(window)),
  ]);
  return { window, search, traffic };
}

export interface SearchAnalytics extends SearchBreakdown {
  totals: Comparison<SearchTotals>;
}

export interface TrafficAnalytics {
  totals: Comparison<TrafficTotals>;
  breakdown: TrafficBreakdown;
}

/**
 * Everything the Traffic & SEO pages show from Search Console for the selected
 * period: totals against the previous period, daily rows, top queries and pages.
 */
export async function getSearchAnalytics(
  range: DateRange,
  today: ISODate,
): Promise<{ window: ReportWindow | null; search: SourceResult<SearchAnalytics> }> {
  await requireSessionUser();
  const window = reportWindow(range, today);
  if (!window) return { window, search: EMPTY };
  const search = await load(async () => {
    const [totals, breakdown] = await Promise.all([fetchSearchTotals(window), fetchSearchBreakdown(window)]);
    return { totals, ...breakdown };
  });
  return { window, search };
}

/** GA4 for the selected period: totals, channels, daily sessions, organic landing pages. */
export async function getTrafficAnalytics(
  range: DateRange,
  today: ISODate,
): Promise<{ window: ReportWindow | null; traffic: SourceResult<TrafficAnalytics> }> {
  await requireSessionUser();
  const window = reportWindow(range, today);
  if (!window) return { window, traffic: EMPTY };
  const traffic = await load(async () => {
    const [totals, breakdown] = await Promise.all([fetchTrafficTotals(window), fetchTrafficBreakdown(window)]);
    return { totals, breakdown };
  });
  return { window, traffic };
}

/** GA4 for the Traffic page: visits, visitors, search and AI, forms, channels, days and landing pages. */
export async function getTrafficOverview(
  range: DateRange,
  today: ISODate,
): Promise<{ window: ReportWindow | null; overview: SourceResult<TrafficOverview> }> {
  await requireSessionUser();
  const window = reportWindow(range, today);
  if (!window) return { window, overview: EMPTY };
  return { window, overview: await load(() => fetchTrafficOverview(window)) };
}

/** GA4 engagement for Behavior Analytics, for the selected period against the one before. */
export async function getBehavior(
  range: DateRange,
  today: ISODate,
): Promise<{ window: ReportWindow | null; behavior: SourceResult<BehaviorData> }> {
  await requireSessionUser();
  const window = reportWindow(range, today);
  if (!window) return { window, behavior: EMPTY };
  return { window, behavior: await load(() => fetchBehavior(window)) };
}

/** GA4 visits from social networks, for the website side of Social Analytics. */
export async function getSocialTraffic(
  range: DateRange,
  today: ISODate,
): Promise<{ window: ReportWindow | null; social: SourceResult<SocialTraffic> }> {
  await requireSessionUser();
  const window = reportWindow(range, today);
  if (!window) return { window, social: EMPTY };
  return { window, social: await load(() => fetchSocialTraffic(window)) };
}
