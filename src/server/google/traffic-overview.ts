import type { ISODate } from "@/lib/types";
import { ORGANIC_CHANNEL } from "./analytics";
import type { Comparison, ReportWindow } from "./reports";

/**
 * Pure GA4 request builders and parsers for the Traffic overview page: visits,
 * visitors, visits from search and AI, form submissions, channels, daily visits
 * and top landing pages. No network, no environment: tested in
 * traffic-overview.test.ts.
 */

interface Ga4Row {
  dimensionValues?: { value?: string }[];
  metricValues?: { value?: string }[];
}
type Ga4Batch = { reports?: { rows?: Ga4Row[] }[] } | null;

const dim = (row: Ga4Row, index: number) => row.dimensionValues?.[index]?.value ?? "";
const num = (row: Ga4Row, index: number) => Number(row.metricValues?.[index]?.value ?? 0) || 0;
const reportsOf = (body: unknown) => (body as Ga4Batch)?.reports ?? [];

/** Our name for visits sent by AI assistants. GA4 has no such channel; it files them mostly under Referral. */
export const AI_CHANNEL = "AI Search";

/**
 * Session sources that are AI assistants: their sites (and subdomains), or the
 * bare names some send as utm_source. Anchored, so "bayou.com" or a campaign
 * called "copilot-newsletter" do not count. One pattern serves both GA4 (RE2,
 * case-insensitive partial match) and the parser below, so they always agree.
 */
export const AI_SOURCE_PATTERN =
  "(^|\\.)(chatgpt\\.com|openai\\.com|perplexity\\.ai|gemini\\.google\\.com|bard\\.google\\.com|copilot\\.microsoft\\.com|copilot\\.com|edgeservices\\.bing\\.com|claude\\.ai|you\\.com|phind\\.com|poe\\.com|deepseek\\.com|meta\\.ai|mistral\\.ai|grok\\.com)$" +
  "|^(chatgpt|openai|perplexity|gemini|copilot|claude|deepseek|grok)$";
const AI_SOURCE = new RegExp(AI_SOURCE_PATTERN, "i");

export function isAiSource(source: string): boolean {
  return AI_SOURCE.test(source);
}

/** The channel a visit is reported under here: GA4's channel, except AI assistants get their own. */
export function channelOf(channelGroup: string, source: string): string {
  if (isAiSource(source)) return AI_CHANNEL;
  return channelGroup || "Unassigned";
}

/** Channels counted as "search and AI": drawn blue, every other channel grey. */
export const SEARCH_AND_AI = new Set([ORGANIC_CHANNEL, AI_CHANNEL]);

/** GA4 filter for visits from search engines or AI assistants. */
const searchAndAiFilter = {
  orGroup: {
    expressions: [
      { filter: { fieldName: "sessionDefaultChannelGroup", stringFilter: { matchType: "EXACT", value: ORGANIC_CHANNEL } } },
      {
        filter: {
          fieldName: "sessionSource",
          stringFilter: { matchType: "PARTIAL_REGEXP", value: AI_SOURCE_PATTERN, caseSensitive: false },
        },
      },
    ],
  },
};

export interface TrafficOverviewTotals {
  /** GA4 sessions. */
  visits: number;
  /** GA4 total users. */
  visitors: number;
  /** Sessions from Organic Search plus AI assistants. */
  searchAndAi: number;
  /** GA4 key events: lead form submissions and any other conversions the property marks as key. */
  forms: number;
}

export interface TrafficChannel {
  channel: string;
  visits: number;
}

export interface TrafficOverviewDay {
  date: ISODate;
  visits: number;
  searchAndAi: number;
}

export interface TrafficLandingPage {
  /** Path as GA4 records it, e.g. /services/seo/. */
  path: string;
  visits: number;
  searchAndAi: number;
  forms: number;
}

export interface TrafficOverview {
  totals: Comparison<TrafficOverviewTotals>;
  /** Current period, most visits first. */
  channels: TrafficChannel[];
  /** Current period, one row per day GA4 reported, in date order. */
  daily: TrafficOverviewDay[];
  /** Current period, most visits first. */
  landingPages: TrafficLandingPage[];
}

/** Landing pages fetched; the page shows the top few, the rest keep the search-and-AI join complete. */
export const LANDING_PAGE_ROWS = 250;

function ranges(window: ReportWindow) {
  return [
    { startDate: window.current.from, endDate: window.current.to, name: "current" },
    { startDate: window.previous.from, endDate: window.previous.to, name: "previous" },
  ];
}
function currentRange(window: ReportWindow) {
  return [{ startDate: window.current.from, endDate: window.current.to }];
}

/**
 * Two batchRunReports bodies (GA4 allows five reports per batch):
 * A0. visits, visitors, key events, both periods;
 * A1. visits by channel and source, both periods (channels, search-and-AI totals);
 * A2. visits per day; A3. search-and-AI visits per day;
 * B0. landing pages: visits, key events; B1. landing pages: search-and-AI visits.
 */
export function trafficOverviewRequests(window: ReportWindow) {
  const current = currentRange(window);
  return [
    {
      requests: [
        { dateRanges: ranges(window), metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "keyEvents" }] },
        {
          dateRanges: ranges(window),
          dimensions: [{ name: "sessionDefaultChannelGroup" }, { name: "sessionSource" }],
          metrics: [{ name: "sessions" }],
          limit: 10000,
        },
        { dateRanges: current, dimensions: [{ name: "date" }], metrics: [{ name: "sessions" }], limit: 5000 },
        {
          dateRanges: current,
          dimensions: [{ name: "date" }],
          metrics: [{ name: "sessions" }],
          dimensionFilter: searchAndAiFilter,
          limit: 5000,
        },
      ],
    },
    {
      requests: [
        {
          dateRanges: current,
          dimensions: [{ name: "landingPage" }],
          metrics: [{ name: "sessions" }, { name: "keyEvents" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: LANDING_PAGE_ROWS,
        },
        {
          dateRanges: current,
          dimensions: [{ name: "landingPage" }],
          metrics: [{ name: "sessions" }],
          dimensionFilter: searchAndAiFilter,
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: LANDING_PAGE_ROWS * 4,
        },
      ],
    },
  ] as const;
}

/** GA4 dates come as YYYYMMDD. */
const ga4Date = (value: string): ISODate => `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;

/** GA4 marks pages it could not attribute as "(not set)". */
const isSet = (value: string) => value !== "" && value !== "(not set)";

export function parseTrafficOverview(batchA: unknown, batchB: unknown): TrafficOverview {
  const [totalsReport, channelReport, dailyReport, dailySaReport] = reportsOf(batchA);
  const [pagesReport, pagesSaReport] = reportsOf(batchB);

  // With several date ranges GA4 appends a "dateRange" dimension holding each range's name.
  const empty = (): TrafficOverviewTotals => ({ visits: 0, visitors: 0, searchAndAi: 0, forms: 0 });
  const totals = { current: empty(), previous: empty() };
  for (const row of totalsReport?.rows ?? []) {
    // The totals report has no dimension of its own, so the range name is dimension 0.
    const target = dim(row, 0) === "previous" ? totals.previous : totals.current;
    target.visits += num(row, 0);
    target.visitors += num(row, 1);
    target.forms += num(row, 2);
  }

  const byChannel = new Map<string, number>();
  for (const row of channelReport?.rows ?? []) {
    const channel = channelOf(dim(row, 0), dim(row, 1));
    const visits = num(row, 0);
    const previous = dim(row, 2) === "previous";
    if (SEARCH_AND_AI.has(channel)) (previous ? totals.previous : totals.current).searchAndAi += visits;
    if (!previous) byChannel.set(channel, (byChannel.get(channel) ?? 0) + visits);
  }
  const channels = [...byChannel]
    .map(([channel, visits]) => ({ channel, visits }))
    .filter((row) => row.visits > 0)
    .sort((a, b) => b.visits - a.visits || a.channel.localeCompare(b.channel));

  const days = new Map<ISODate, TrafficOverviewDay>();
  for (const row of dailyReport?.rows ?? []) {
    const date = ga4Date(dim(row, 0));
    days.set(date, { date, visits: num(row, 0), searchAndAi: 0 });
  }
  for (const row of dailySaReport?.rows ?? []) {
    const date = ga4Date(dim(row, 0));
    const day = days.get(date) ?? { date, visits: 0, searchAndAi: 0 };
    day.searchAndAi += num(row, 0);
    days.set(date, day);
  }
  const daily = [...days.values()].sort((a, b) => a.date.localeCompare(b.date));

  const pageSa = new Map<string, number>();
  for (const row of pagesSaReport?.rows ?? []) pageSa.set(dim(row, 0), num(row, 0));
  const landingPages = (pagesReport?.rows ?? [])
    .filter((row) => isSet(dim(row, 0)))
    .map((row) => ({
      path: dim(row, 0),
      visits: num(row, 0),
      forms: num(row, 1),
      searchAndAi: pageSa.get(dim(row, 0)) ?? 0,
    }))
    .sort((a, b) => b.visits - a.visits || a.path.localeCompare(b.path));

  return { totals, channels, daily, landingPages };
}
