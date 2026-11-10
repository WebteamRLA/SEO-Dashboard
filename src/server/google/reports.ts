import { addDays, type DateRange } from "@/lib/date-range";
import type { ISODate } from "@/lib/types";

/**
 * Pure request builders and response parsers for Search Console and GA4.
 * No network, no environment: tested in reports.test.ts.
 */

export interface SearchTotals {
  clicks: number;
  impressions: number;
  /** Percent, e.g. 3.4. Null when there were no impressions. */
  ctr: number | null;
  /** Average position. Null when there were no impressions. */
  position: number | null;
}

export interface TrafficTotals {
  sessions: number;
  users: number;
  organicSessions: number;
  organicUsers: number;
}

export interface Comparison<T> {
  current: T;
  previous: T;
}

export interface ReportWindow {
  current: DateRange;
  /** The same number of days immediately before `current`. */
  previous: DateRange;
  days: number;
}

const DAY_MS = 86_400_000;

function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;
}

/**
 * The part of the selected period that has complete data: it ends yesterday at
 * the latest, because today is still being counted by both Google sources and
 * would make every period look worse than the one before it. Null when the
 * period has no complete day yet (e.g. "This month" on the 1st, or the future).
 */
export function reportWindow(range: DateRange, today: ISODate): ReportWindow | null {
  const yesterday = addDays(today, -1);
  const to = range.to < yesterday ? range.to : yesterday;
  if (range.from > to) return null;
  const days = daysBetween(range.from, to);
  return {
    current: { from: range.from, to },
    previous: { from: addDays(range.from, -days), to: addDays(range.from, -1) },
    days,
  };
}

// ---------------------------------------------------------------- Search Console

/** Body for searchAnalytics.query: one aggregated row for the whole property. */
export function searchConsoleQuery(range: DateRange) {
  return {
    startDate: range.from,
    endDate: range.to,
    type: "web",
    // Includes the last day or two that Google has not finalised yet, so a
    // recent period is not missing its newest days.
    dataState: "all",
  };
}

interface SearchConsoleResponse {
  rows?: { clicks?: number; impressions?: number; ctr?: number; position?: number }[];
}

export function parseSearchConsole(body: unknown): SearchTotals {
  const row = (body as SearchConsoleResponse | null)?.rows?.[0];
  const clicks = Math.round(row?.clicks ?? 0);
  const impressions = Math.round(row?.impressions ?? 0);
  if (impressions === 0) return { clicks, impressions, ctr: null, position: null };
  return {
    clicks,
    impressions,
    // Google returns a fraction; the dashboard shows percent to one decimal.
    ctr: Math.round((row?.ctr ?? clicks / impressions) * 1000) / 10,
    position: Math.round((row?.position ?? 0) * 10) / 10,
  };
}

/** The site URL as Search Console names it, e.g. sc-domain:example.com, made safe for a path. */
export function searchConsolePath(siteUrl: string): string {
  return `/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
}

// ---------------------------------------------------------------- GA4

const ORGANIC_CHANNEL = "Organic Search";
const TRAFFIC_METRICS = [{ name: "sessions" }, { name: "totalUsers" }];

/**
 * Body for properties.batchRunReports: all traffic, then organic only, each
 * across both date ranges. Two reports, because users cannot be summed across
 * channels (one person can arrive through several).
 */
export function ga4BatchRequest(window: ReportWindow) {
  const dateRanges = [
    { startDate: window.current.from, endDate: window.current.to, name: "current" },
    { startDate: window.previous.from, endDate: window.previous.to, name: "previous" },
  ];
  return {
    requests: [
      { dateRanges, metrics: TRAFFIC_METRICS },
      {
        dateRanges,
        metrics: TRAFFIC_METRICS,
        dimensionFilter: {
          filter: {
            fieldName: "sessionDefaultChannelGroup",
            stringFilter: { matchType: "EXACT", value: ORGANIC_CHANNEL },
          },
        },
      },
    ],
  };
}

interface Ga4Report {
  rows?: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[];
}

function readReport(report: Ga4Report | undefined, rangeName: "current" | "previous") {
  // With several date ranges GA4 adds a "dateRange" dimension holding each range's name.
  const row = report?.rows?.find((candidate) => candidate.dimensionValues?.[0]?.value === rangeName);
  const metric = (index: number) => Number(row?.metricValues?.[index]?.value ?? 0) || 0;
  return { sessions: metric(0), users: metric(1) };
}

export function parseGa4Batch(body: unknown): Comparison<TrafficTotals> {
  const reports = (body as { reports?: Ga4Report[] } | null)?.reports ?? [];
  const build = (rangeName: "current" | "previous"): TrafficTotals => {
    const all = readReport(reports[0], rangeName);
    const organic = readReport(reports[1], rangeName);
    return {
      sessions: all.sessions,
      users: all.users,
      organicSessions: organic.sessions,
      organicUsers: organic.users,
    };
  };
  return { current: build("current"), previous: build("previous") };
}

/** Accepts "123456789" or "properties/123456789"; returns the bare number, or null. */
export function normalizePropertyId(value: string): string | null {
  const id = value.trim().replace(/^properties\//, "");
  return /^\d+$/.test(id) ? id : null;
}
