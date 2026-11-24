import type { DateRange } from "@/lib/date-range";
import type { ISODate } from "@/lib/types";
import { bucket, fillDays, type TrendPoint } from "./analytics";
import type { ReportWindow } from "./reports";

/**
 * Pure GA4 request builders and parsers for Behavior Analytics and the
 * website side of Social Analytics. No network, no environment: tested in
 * engagement.test.ts.
 */

interface Ga4Row {
  dimensionValues?: { value?: string }[];
  metricValues?: { value?: string }[];
}
type Ga4Batch = { reports?: { rows?: Ga4Row[] }[] } | null;

const dim = (row: Ga4Row, index: number) => row.dimensionValues?.[index]?.value ?? "";
const num = (row: Ga4Row, index: number) => Number(row.metricValues?.[index]?.value ?? 0) || 0;
const reportsOf = (body: unknown) => (body as Ga4Batch)?.reports ?? [];
const round1 = (value: number) => Math.round(value * 10) / 10;

function ranges(window: ReportWindow) {
  return [
    { startDate: window.current.from, endDate: window.current.to, name: "current" },
    { startDate: window.previous.from, endDate: window.previous.to, name: "previous" },
  ];
}
function currentRange(window: ReportWindow) {
  return [{ startDate: window.current.from, endDate: window.current.to }];
}

/** GA4 marks pages and events it could not attribute as "(not set)". */
const isSet = (value: string) => value !== "" && value !== "(not set)";

// ---------------------------------------------------------------- Behavior

export interface EngagementTotals {
  sessions: number;
  /** Percent, one decimal: engaged sessions / sessions. Null without sessions. */
  engagementRate: number | null;
  /** Average engagement time per session, in seconds. Null without sessions. */
  engagementSeconds: number | null;
  /** Page views per session, one decimal. Null without sessions. */
  viewsPerSession: number | null;
  /** Key events (conversions) such as lead form submissions. */
  keyEvents: number;
}

export interface PageEngagement {
  path: string;
  views: number;
  /** Average engagement time per view, in seconds. Null without views. */
  secondsPerView: number | null;
  /** Percent of views where the visitor reached 90% of the page (GA4's scroll event). */
  readToEnd: number | null;
}

export interface EnquiryLandingPage {
  path: string;
  sessions: number;
  keyEvents: number;
  /** Percent of sessions from this landing page with at least one key event. */
  conversionRate: number | null;
}

export interface KeyEventRow {
  event: string;
  count: number;
}

export interface DeviceRow {
  device: string;
  sessions: number;
  engagementRate: number | null;
}

export interface BehaviorData {
  totals: { current: EngagementTotals; previous: EngagementTotals };
  pages: PageEngagement[];
  enquiryPages: EnquiryLandingPage[];
  keyEvents: KeyEventRow[];
  devices: DeviceRow[];
}

export const BEHAVIOR_TOP_PAGES = 250;

const TOTAL_METRICS = [
  { name: "sessions" },
  { name: "engagedSessions" },
  { name: "userEngagementDuration" },
  { name: "screenPageViews" },
  { name: "keyEvents" },
];

/**
 * Two batchRunReports bodies (GA4 allows five reports per batch):
 * A. totals (current + previous), pages, scroll events per page, enquiry landing pages;
 * B. key events by name, devices.
 */
export function behaviorRequests(window: ReportWindow) {
  const current = currentRange(window);
  return [
    {
      requests: [
        { dateRanges: ranges(window), metrics: TOTAL_METRICS },
        {
          dateRanges: current,
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "screenPageViews" }, { name: "userEngagementDuration" }],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: BEHAVIOR_TOP_PAGES,
        },
        {
          dateRanges: current,
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "eventCount" }],
          dimensionFilter: { filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: "scroll" } } },
          limit: 10000,
        },
        {
          dateRanges: current,
          dimensions: [{ name: "landingPage" }],
          metrics: [{ name: "sessions" }, { name: "keyEvents" }, { name: "sessionKeyEventRate" }],
          metricFilter: { filter: { fieldName: "keyEvents", numericFilter: { operation: "GREATER_THAN", value: { doubleValue: 0 } } } },
          orderBys: [{ metric: { metricName: "keyEvents" }, desc: true }],
          limit: 100,
        },
      ],
    },
    {
      requests: [
        {
          dateRanges: current,
          dimensions: [{ name: "eventName" }],
          metrics: [{ name: "keyEvents" }],
          metricFilter: { filter: { fieldName: "keyEvents", numericFilter: { operation: "GREATER_THAN", value: { doubleValue: 0 } } } },
          orderBys: [{ metric: { metricName: "keyEvents" }, desc: true }],
        },
        {
          dateRanges: current,
          dimensions: [{ name: "deviceCategory" }],
          metrics: [{ name: "sessions" }, { name: "engagedSessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        },
      ],
    },
  ];
}

function toTotals(row: Ga4Row | undefined): EngagementTotals {
  const sessions = row ? num(row, 0) : 0;
  const engaged = row ? num(row, 1) : 0;
  const seconds = row ? num(row, 2) : 0;
  const views = row ? num(row, 3) : 0;
  return {
    sessions,
    engagementRate: sessions ? round1((engaged / sessions) * 100) : null,
    engagementSeconds: sessions ? Math.round(seconds / sessions) : null,
    viewsPerSession: sessions ? round1(views / sessions) : null,
    keyEvents: row ? num(row, 4) : 0,
  };
}

/** Parses the two batch responses from behaviorRequests, in order. */
export function parseBehavior(batchA: unknown, batchB: unknown): BehaviorData {
  const [totalsReport, pagesReport, scrollReport, enquiryReport] = reportsOf(batchA);
  const [eventsReport, devicesReport] = reportsOf(batchB);

  // With two named date ranges GA4 adds a trailing "dateRange" dimension holding the name.
  const totalRows = totalsReport?.rows ?? [];
  const byRange = (name: string) => totalRows.find((row) => dim(row, 0) === name);

  const scrolls = new Map<string, number>();
  for (const row of scrollReport?.rows ?? []) scrolls.set(dim(row, 0), (scrolls.get(dim(row, 0)) ?? 0) + num(row, 0));

  const pages = (pagesReport?.rows ?? [])
    .filter((row) => isSet(dim(row, 0)))
    .map((row): PageEngagement => {
      const path = dim(row, 0);
      const views = num(row, 0);
      return {
        path,
        views,
        secondsPerView: views ? Math.round(num(row, 1) / views) : null,
        // GA4 sends one scroll event per page view at most, so this stays ≤ 100%.
        readToEnd: views ? Math.min(100, round1(((scrolls.get(path) ?? 0) / views) * 100)) : null,
      };
    });

  const enquiryPages = (enquiryReport?.rows ?? [])
    .filter((row) => isSet(dim(row, 0)))
    .map((row) => {
      const sessions = num(row, 0);
      return {
        path: dim(row, 0),
        sessions,
        keyEvents: num(row, 1),
        // sessionKeyEventRate is a fraction.
        conversionRate: sessions ? round1(num(row, 2) * 100) : null,
      };
    });

  const keyEvents = (eventsReport?.rows ?? []).map((row) => ({ event: dim(row, 0), count: num(row, 0) }));

  const devices = (devicesReport?.rows ?? []).map((row) => {
    const sessions = num(row, 0);
    return {
      device: dim(row, 0) || "Unknown",
      sessions,
      engagementRate: sessions ? round1((num(row, 1) / sessions) * 100) : null,
    };
  });

  return {
    totals: { current: toTotals(byRange("current")), previous: toTotals(byRange("previous")) },
    pages,
    enquiryPages,
    keyEvents,
    devices,
  };
}

// ---------------------------------------------------------------- Social (website side)

export const SOCIAL_CHANNELS = ["Organic Social", "Paid Social"];

export interface SocialTotals {
  sessions: number;
  engagedSessions: number;
  keyEvents: number;
}

export interface SocialPlatformRow {
  platform: string;
  sessions: number;
  previousSessions: number;
  engagedSessions: number;
  keyEvents: number;
}

export interface SocialLandingPage {
  path: string;
  sessions: number;
  keyEvents: number;
}

export interface SocialDay {
  date: ISODate;
  sessions: number;
}

export interface SocialTraffic {
  totals: { current: SocialTotals; previous: SocialTotals };
  platforms: SocialPlatformRow[];
  landingPages: SocialLandingPage[];
  daily: SocialDay[];
}

/** Groups referrer hosts into platforms: m.facebook.com and l.facebook.com are both Facebook. */
export function platformOf(source: string): string {
  const s = source.toLowerCase();
  // Meta ads tag visits with source "meta"; Messenger links are Facebook too.
  if (/facebook|messenger|(^|\.)fb\.(com|me)$|^fb$|^meta$/.test(s)) return "Facebook";
  if (/linkedin|lnkd\.in/.test(s)) return "LinkedIn";
  if (/instagram/.test(s)) return "Instagram";
  if (/^t\.co$|twitter|(^|\.)x\.com$/.test(s)) return "X (Twitter)";
  if (/youtube|youtu\.be/.test(s)) return "YouTube";
  if (/reddit/.test(s)) return "Reddit";
  if (/pinterest/.test(s)) return "Pinterest";
  if (/tiktok/.test(s)) return "TikTok";
  if (/threads\.(net|com)/.test(s)) return "Threads";
  return source || "Other";
}

const socialFilter = {
  filter: { fieldName: "sessionDefaultChannelGroup", inListFilter: { values: SOCIAL_CHANNELS } },
};

/** One batchRunReports body: totals, sources (both periods), landing pages, sessions per day. */
export function socialRequest(window: ReportWindow) {
  const current = currentRange(window);
  return {
    requests: [
      {
        dateRanges: ranges(window),
        metrics: [{ name: "sessions" }, { name: "engagedSessions" }, { name: "keyEvents" }],
        dimensionFilter: socialFilter,
      },
      {
        dateRanges: ranges(window),
        dimensions: [{ name: "sessionSource" }],
        metrics: [{ name: "sessions" }, { name: "engagedSessions" }, { name: "keyEvents" }],
        dimensionFilter: socialFilter,
        limit: 500,
      },
      {
        dateRanges: current,
        dimensions: [{ name: "landingPage" }],
        metrics: [{ name: "sessions" }, { name: "keyEvents" }],
        dimensionFilter: socialFilter,
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 100,
      },
      {
        dateRanges: current,
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }],
        dimensionFilter: socialFilter,
        limit: 2000,
      },
    ],
  };
}

const ga4Date = (value: string) => `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` as ISODate;

export function parseSocial(body: unknown): SocialTraffic {
  const [totalsReport, sourcesReport, pagesReport, dailyReport] = reportsOf(body);

  const totalsFor = (name: string): SocialTotals => {
    const row = (totalsReport?.rows ?? []).find((candidate) => dim(candidate, 0) === name);
    return { sessions: row ? num(row, 0) : 0, engagedSessions: row ? num(row, 1) : 0, keyEvents: row ? num(row, 2) : 0 };
  };

  const byPlatform = new Map<string, SocialPlatformRow>();
  for (const row of sourcesReport?.rows ?? []) {
    const platform = platformOf(dim(row, 0));
    const entry = byPlatform.get(platform) ?? { platform, sessions: 0, previousSessions: 0, engagedSessions: 0, keyEvents: 0 };
    if (dim(row, 1) === "previous") {
      entry.previousSessions += num(row, 0);
    } else {
      entry.sessions += num(row, 0);
      entry.engagedSessions += num(row, 1);
      entry.keyEvents += num(row, 2);
    }
    byPlatform.set(platform, entry);
  }

  return {
    totals: { current: totalsFor("current"), previous: totalsFor("previous") },
    platforms: [...byPlatform.values()].sort(
      (a, b) => b.sessions - a.sessions || b.previousSessions - a.previousSessions || a.platform.localeCompare(b.platform),
    ),
    landingPages: (pagesReport?.rows ?? [])
      .filter((row) => isSet(dim(row, 0)))
      .map((row) => ({ path: dim(row, 0), sessions: num(row, 0), keyEvents: num(row, 1) })),
    daily: (dailyReport?.rows ?? [])
      .map((row) => ({ date: ga4Date(dim(row, 0)), sessions: num(row, 0) }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export interface SocialPoint extends TrendPoint {
  sessions: number;
}

/** Social visits per day (or month for long periods), with days without visits as zero. */
export function socialTrend(days: readonly SocialDay[], range: DateRange, unit: "day" | "month"): SocialPoint[] {
  return bucket<SocialDay, { sessions: number }>(
    fillDays(days, range, (date) => ({ date, sessions: 0 })),
    unit,
    (row) => ({ sessions: row.sessions }),
    (into, row) => {
      into.sessions += row.sessions;
    },
  );
}
