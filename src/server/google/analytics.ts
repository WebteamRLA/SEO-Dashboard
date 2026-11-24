import { addDays, type DateRange } from "@/lib/date-range";
import type { ISODate } from "@/lib/types";
import type { ReportWindow } from "./reports";

/**
 * Pure request builders and parsers for the Traffic & SEO pages: daily trends,
 * top queries, top pages, channels. No network, no environment: tested in
 * analytics.test.ts. Totals for the selected period live in reports.ts.
 */

// ---------------------------------------------------------------- Search Console

export interface SearchRow {
  clicks: number;
  impressions: number;
  /** Percent, one decimal. Null when there were no impressions. */
  ctr: number | null;
  /** Average position, one decimal. Null when there were no impressions. */
  position: number | null;
}

export interface SearchDay extends SearchRow {
  date: ISODate;
}

export interface KeywordRow extends SearchRow {
  query: string;
  /**
   * Places gained versus the previous period (positive = ranks higher now).
   * Null when the query had no impressions in the previous period.
   */
  positionChange: number | null;
}

export interface PageRow extends SearchRow {
  url: string;
}

/** How many queries and pages to fetch for the tables. */
export const TOP_ROWS = 250;
/** Previous-period queries fetched to compute position change; wider so the top 250 usually match. */
export const PREVIOUS_QUERY_ROWS = 1000;

/** Body for searchAnalytics.query, grouped by one dimension. */
export function searchConsoleBreakdown(range: DateRange, dimension: "date" | "query" | "page", rowLimit: number) {
  return {
    startDate: range.from,
    endDate: range.to,
    type: "web",
    dimensions: [dimension],
    rowLimit,
    dataState: "all",
  };
}

interface RawSearchRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

function toSearchRow(raw: RawSearchRow): SearchRow {
  const clicks = Math.round(raw.clicks ?? 0);
  const impressions = Math.round(raw.impressions ?? 0);
  if (impressions === 0) return { clicks, impressions, ctr: null, position: null };
  return {
    clicks,
    impressions,
    ctr: round1((raw.ctr ?? clicks / impressions) * 100),
    position: round1(raw.position ?? 0),
  };
}

function rowsOf(body: unknown): RawSearchRow[] {
  return ((body as { rows?: RawSearchRow[] } | null)?.rows ?? []).filter((row) => row.keys?.[0] !== undefined);
}

/** Daily rows, in date order. */
export function parseSearchDays(body: unknown): SearchDay[] {
  return rowsOf(body)
    .map((raw) => ({ date: raw.keys![0] as ISODate, ...toSearchRow(raw) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Top queries, each with its position change against the previous period. */
export function parseKeywords(currentBody: unknown, previousBody: unknown): KeywordRow[] {
  const previous = new Map<string, number>();
  for (const raw of rowsOf(previousBody)) {
    const row = toSearchRow(raw);
    if (row.position !== null) previous.set(raw.keys![0]!, row.position);
  }
  return rowsOf(currentBody).map((raw) => {
    const query = raw.keys![0]!;
    const row = toSearchRow(raw);
    const before = previous.get(query);
    return {
      query,
      ...row,
      positionChange: row.position === null || before === undefined ? null : round1(before - row.position),
    };
  });
}

export function parsePages(body: unknown): PageRow[] {
  return rowsOf(body).map((raw) => ({ url: raw.keys![0]!, ...toSearchRow(raw) }));
}

// ---------------------------------------------------------------- GA4

export const ORGANIC_CHANNEL = "Organic Search";
const REFERRAL_CHANNEL = "Referral";

export interface ChannelRow {
  channel: string;
  sessions: number;
  previousSessions: number;
}

export interface TrafficDay {
  date: ISODate;
  sessions: number;
  organicSessions: number;
}

export interface LandingPageRow {
  /** Path as GA4 records it, e.g. /services/seo/. */
  path: string;
  sessions: number;
  users: number;
}

export interface TrafficBreakdown {
  channels: ChannelRow[];
  /** Referral sessions in the current and previous period. */
  referral: { current: number; previous: number };
  daily: TrafficDay[];
  /** Organic Search landing pages, most sessions first. */
  landingPages: LandingPageRow[];
}

const organicFilter = {
  filter: {
    fieldName: "sessionDefaultChannelGroup",
    stringFilter: { matchType: "EXACT", value: ORGANIC_CHANNEL },
  },
};

/**
 * Body for properties.batchRunReports (max 5 reports per batch):
 * 0. sessions by channel, current and previous period;
 * 1. sessions per day and channel, current period (summed into all + organic);
 * 2. organic sessions and users per landing page, current period.
 */
export function ga4BreakdownRequest(window: ReportWindow) {
  const current = { startDate: window.current.from, endDate: window.current.to };
  return {
    requests: [
      {
        dateRanges: [
          { ...current, name: "current" },
          { startDate: window.previous.from, endDate: window.previous.to, name: "previous" },
        ],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }],
      },
      {
        dateRanges: [current],
        dimensions: [{ name: "date" }, { name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }],
        // Days × channels: a 3-year custom range is ~11k rows, past GA4's default of 10k.
        limit: 100000,
      },
      {
        dateRanges: [current],
        dimensions: [{ name: "landingPage" }],
        metrics: [{ name: "sessions" }, { name: "totalUsers" }],
        dimensionFilter: organicFilter,
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: TOP_ROWS,
      },
    ],
  };
}

interface Ga4Row {
  dimensionValues?: { value?: string }[];
  metricValues?: { value?: string }[];
}

const dim = (row: Ga4Row, index: number) => row.dimensionValues?.[index]?.value ?? "";
const metric = (row: Ga4Row, index: number) => Number(row.metricValues?.[index]?.value ?? 0) || 0;

/** GA4 dates come as YYYYMMDD. */
function ga4Date(value: string): ISODate {
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` as ISODate;
}

export function parseGa4Breakdown(body: unknown): TrafficBreakdown {
  const reports = (body as { reports?: { rows?: Ga4Row[] }[] } | null)?.reports ?? [];

  // With several date ranges GA4 appends a "dateRange" dimension holding each range's name.
  const channelMap = new Map<string, ChannelRow>();
  for (const row of reports[0]?.rows ?? []) {
    const channel = dim(row, 0) || "Unassigned";
    const entry = channelMap.get(channel) ?? { channel, sessions: 0, previousSessions: 0 };
    if (dim(row, 1) === "previous") entry.previousSessions += metric(row, 0);
    else entry.sessions += metric(row, 0);
    channelMap.set(channel, entry);
  }
  const channels = [...channelMap.values()].sort((a, b) => b.sessions - a.sessions || a.channel.localeCompare(b.channel));
  const referralRow = channelMap.get(REFERRAL_CHANNEL);

  const dayMap = new Map<string, TrafficDay>();
  for (const row of reports[1]?.rows ?? []) {
    const date = ga4Date(dim(row, 0));
    const entry = dayMap.get(date) ?? { date, sessions: 0, organicSessions: 0 };
    entry.sessions += metric(row, 0);
    if (dim(row, 1) === ORGANIC_CHANNEL) entry.organicSessions += metric(row, 0);
    dayMap.set(date, entry);
  }
  const daily = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  const landingPages = (reports[2]?.rows ?? [])
    .map((row) => ({ path: dim(row, 0), sessions: metric(row, 0), users: metric(row, 1) }))
    // GA4 reports sessions with no landing page as "(not set)".
    .filter((row) => row.path && row.path !== "(not set)");

  return {
    channels,
    referral: { current: referralRow?.sessions ?? 0, previous: referralRow?.previousSessions ?? 0 },
    daily,
    landingPages,
  };
}

// ---------------------------------------------------------------- Trend buckets

export interface TrendPoint {
  /** First day of the bucket. */
  start: ISODate;
  /** "day" for periods up to MAX_DAILY_DAYS, otherwise "month". */
  unit: "day" | "month";
}

/** Longer periods are charted by month, so a year is 12 points, not 365. */
export const MAX_DAILY_DAYS = 92;

export function trendUnit(days: number): "day" | "month" {
  return days <= MAX_DAILY_DAYS ? "day" : "month";
}

/**
 * One row per day of `range`: Search Console and GA4 leave out days with no
 * data, which would otherwise make a chart skip dates and join across them.
 */
export function fillDays<T extends { date: ISODate }>(rows: readonly T[], range: DateRange, empty: (date: ISODate) => T): T[] {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  const out: T[] = [];
  for (let date = range.from; date <= range.to; date = addDays(date, 1)) {
    out.push(byDate.get(date) ?? empty(date));
  }
  return out;
}

/** Groups daily rows into days or months, summing with `merge`. Input and output are in date order. */
export function bucket<T extends { date: ISODate }, B>(
  rows: readonly T[],
  unit: "day" | "month",
  start: (row: T) => B,
  merge: (into: B, row: T) => void,
): (B & TrendPoint)[] {
  const out: (B & TrendPoint)[] = [];
  for (const row of rows) {
    const key = (unit === "day" ? row.date : `${row.date.slice(0, 7)}-01`) as ISODate;
    const last = out[out.length - 1];
    if (last && last.start === key) merge(last, row);
    else out.push({ ...start(row), start: key, unit });
  }
  return out;
}

export interface SearchPoint extends TrendPoint, SearchRow {}

/**
 * Daily Search Console rows → trend points over `range` (missing days count as
 * zero); CTR and position are re-derived, position weighted by impressions.
 */
export function searchTrend(days: readonly SearchDay[], range: DateRange, unit: "day" | "month"): SearchPoint[] {
  type Acc = { clicks: number; impressions: number; weighted: number };
  const filled = fillDays(days, range, (date) => ({ date, clicks: 0, impressions: 0, ctr: null, position: null }));
  const acc = bucket<SearchDay, Acc>(
    filled,
    unit,
    (row) => ({ clicks: row.clicks, impressions: row.impressions, weighted: (row.position ?? 0) * row.impressions }),
    (into, row) => {
      into.clicks += row.clicks;
      into.impressions += row.impressions;
      into.weighted += (row.position ?? 0) * row.impressions;
    },
  );
  return acc.map(({ clicks, impressions, weighted, start, unit: u }) => ({
    start,
    unit: u,
    clicks,
    impressions,
    ctr: impressions === 0 ? null : round1((clicks / impressions) * 100),
    position: impressions === 0 ? null : round1(weighted / impressions),
  }));
}

export interface TrafficPoint extends TrendPoint {
  sessions: number;
  organicSessions: number;
}

export function trafficTrend(days: readonly TrafficDay[], range: DateRange, unit: "day" | "month"): TrafficPoint[] {
  return bucket<TrafficDay, { sessions: number; organicSessions: number }>(
    fillDays(days, range, (date) => ({ date, sessions: 0, organicSessions: 0 })),
    unit,
    (row) => ({ sessions: row.sessions, organicSessions: row.organicSessions }),
    (into, row) => {
      into.sessions += row.sessions;
      into.organicSessions += row.organicSessions;
    },
  );
}

// ---------------------------------------------------------------- Landing pages

/** "https://example.com/a/?x=1" → "/a/"; a bare path is returned without its query. */
export function toPath(url: string): string {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url.split(/[?#]/)[0] || "/";
  }
}

/** Join key: Search Console keeps the trailing slash (/a/), GA4 drops it (/a). */
function pathKey(url: string): string {
  const path = toPath(url);
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

export interface LandingPageSummary {
  path: string;
  /** Full URL from Search Console, when it has the page. */
  url: string | null;
  /** Null when the page is not in Search Console's top pages (not the same as zero). */
  clicks: number | null;
  impressions: number | null;
  /** Null when the page is not in GA4's top organic landing pages. */
  organicSessions: number | null;
}

/**
 * Joins Search Console pages (full URLs) with GA4 organic landing pages (paths)
 * on the path, ignoring a trailing slash. Pages in either source are kept; most clicks first, then sessions.
 */
export function joinLandingPages(pages: readonly PageRow[], landing: readonly LandingPageRow[]): LandingPageSummary[] {
  const byPath = new Map<string, LandingPageSummary>();
  for (const page of pages) {
    const key = pathKey(page.url);
    const entry = byPath.get(key) ?? { path: toPath(page.url), url: page.url, clicks: null, impressions: null, organicSessions: null };
    entry.clicks = (entry.clicks ?? 0) + page.clicks;
    entry.impressions = (entry.impressions ?? 0) + page.impressions;
    byPath.set(key, entry);
  }
  for (const row of landing) {
    const key = pathKey(row.path);
    const entry = byPath.get(key) ?? { path: toPath(row.path), url: null, clicks: null, impressions: null, organicSessions: null };
    entry.organicSessions = (entry.organicSessions ?? 0) + row.sessions;
    byPath.set(key, entry);
  }
  return [...byPath.values()].sort(
    (a, b) =>
      (b.clicks ?? 0) - (a.clicks ?? 0) || (b.organicSessions ?? 0) - (a.organicSessions ?? 0) || a.path.localeCompare(b.path),
  );
}
