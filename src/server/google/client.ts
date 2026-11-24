import "server-only";
import { createSwrCache } from "@/server/cache/swr";
import { fetchAccessToken, type AccessToken } from "./credentials";
import { getGa4PropertyId, getSearchConsoleSite, getServiceAccount } from "./config";
import {
  ga4BreakdownRequest,
  parseGa4Breakdown,
  parseKeywords,
  parsePages,
  parseSearchDays,
  PREVIOUS_QUERY_ROWS,
  searchConsoleBreakdown,
  TOP_ROWS,
  type KeywordRow,
  type PageRow,
  type SearchDay,
  type TrafficBreakdown,
} from "./analytics";
import {
  behaviorRequests,
  parseBehavior,
  parseSocial,
  socialRequest,
  type BehaviorData,
  type SocialTraffic,
} from "./engagement";
import {
  ga4BatchRequest,
  parseGa4Batch,
  parseSearchConsole,
  searchConsolePath,
  searchConsoleQuery,
  type Comparison,
  type ReportWindow,
  type SearchTotals,
  type TrafficTotals,
} from "./reports";

export class GoogleRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleRequestError";
  }
}

/** Short, so an outage costs a page load seconds, not half a minute. */
const TIMEOUT_MS = 8_000;
/** Google reports change slowly; this keeps page loads off the API quota. */
const REPORT_TTL_MS = 10 * 60_000;
/** Older reports are still shown at once while they refresh in the background. */
const STALE_MS = 6 * 60 * 60_000;
/** A failure is remembered briefly, so a broken credential is not retried on every load. */
const FAILURE_TTL_MS = 60_000;

let token: AccessToken | null = null;
let pendingToken: Promise<AccessToken> | null = null;

/** One token exchange at a time: parallel reports on a cold start share it. */
async function accessToken(): Promise<string> {
  if (token && token.expiresAt - Date.now() > 60_000) return token.token;
  pendingToken ??= fetchAccessToken(getServiceAccount()).finally(() => {
    pendingToken = null;
  });
  token = await pendingToken;
  return token.token;
}

/** Plain-language hints for the failures people actually hit while granting access. */
function describeFailure(service: string, status: number, message: string | undefined): string {
  if (status === 403 && /has not been used|is disabled/i.test(message ?? "")) {
    return `${service}: the API is not enabled in the service account's Google Cloud project.`;
  }
  if (status === 403 || status === 404) {
    return `${service}: the service account has no access to this property yet (${status}).`;
  }
  return `${service} returned ${status}${message ? `: ${message}` : ""}.`;
}

async function send(service: string, url: string, body: unknown): Promise<Response> {
  const bearer = await accessToken();
  try {
    return await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new GoogleRequestError(`${service} did not respond in time.`);
    }
    throw new GoogleRequestError(`Could not reach ${service}.`);
  }
}

async function post<T>(service: string, url: string, body: unknown): Promise<T> {
  let response = await send(service, url, body);
  if (response.status === 401) {
    // The cached token was revoked early (e.g. the key was rotated): get a new one, once.
    token = null;
    response = await send(service, url, body);
  }
  const json = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
  if (!response.ok) {
    // Google's error message names the API or permission problem; it never holds the token.
    throw new GoogleRequestError(describeFailure(service, response.status, json?.error?.message));
  }
  return json as T;
}

/**
 * Google reports change slowly. A report under REPORT_TTL_MS old is served as
 * is; one up to STALE_MS old is served at once while a background request
 * refreshes it; identical requests in flight share one call. A failure is
 * remembered for FAILURE_TTL_MS.
 */
const reports = createSwrCache<unknown>({ freshMs: REPORT_TTL_MS, staleMs: STALE_MS, failureMs: FAILURE_TTL_MS });

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  return reports(key, load) as Promise<T>;
}

export async function fetchSearchTotals(window: ReportWindow): Promise<Comparison<SearchTotals>> {
  const site = getSearchConsoleSite();
  const url = `https://www.googleapis.com${searchConsolePath(site)}`;
  return cached(`gsc|${site}|${window.current.from}|${window.current.to}`, async () => {
    const [current, previous] = await Promise.all([
      post("Search Console", url, searchConsoleQuery(window.current)),
      post("Search Console", url, searchConsoleQuery(window.previous)),
    ]);
    return { current: parseSearchConsole(current), previous: parseSearchConsole(previous) };
  });
}

export async function fetchTrafficTotals(window: ReportWindow): Promise<Comparison<TrafficTotals>> {
  const property = getGa4PropertyId();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${property}:batchRunReports`;
  return cached(`ga4|${property}|${window.current.from}|${window.current.to}`, async () =>
    parseGa4Batch(await post("Google Analytics", url, ga4BatchRequest(window))),
  );
}

export interface SearchBreakdown {
  daily: SearchDay[];
  keywords: KeywordRow[];
  pages: PageRow[];
}

/**
 * Daily rows, top queries (with position change against the previous period)
 * and top pages for the window. Four Search Console calls, made in parallel.
 */
export async function fetchSearchBreakdown(window: ReportWindow): Promise<SearchBreakdown> {
  const site = getSearchConsoleSite();
  const url = `https://www.googleapis.com${searchConsolePath(site)}`;
  return cached(`gsc-breakdown|${site}|${window.current.from}|${window.current.to}`, async () => {
    const [daily, queries, previousQueries, pages] = await Promise.all([
      post("Search Console", url, searchConsoleBreakdown(window.current, "date", 1000)),
      post("Search Console", url, searchConsoleBreakdown(window.current, "query", TOP_ROWS)),
      post("Search Console", url, searchConsoleBreakdown(window.previous, "query", PREVIOUS_QUERY_ROWS)),
      post("Search Console", url, searchConsoleBreakdown(window.current, "page", TOP_ROWS)),
    ]);
    return {
      daily: parseSearchDays(daily),
      keywords: parseKeywords(queries, previousQueries),
      pages: parsePages(pages),
    };
  });
}

/** Channels, daily sessions and organic landing pages for the window, in one GA4 batch call. */
export async function fetchTrafficBreakdown(window: ReportWindow): Promise<TrafficBreakdown> {
  const property = getGa4PropertyId();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${property}:batchRunReports`;
  return cached(`ga4-breakdown|${property}|${window.current.from}|${window.current.to}`, async () =>
    parseGa4Breakdown(await post("Google Analytics", url, ga4BreakdownRequest(window))),
  );
}

function ga4BatchUrl(property: string): string {
  return `https://analyticsdata.googleapis.com/v1beta/properties/${property}:batchRunReports`;
}

/** Engagement, pages, enquiry landing pages, key events and devices: two GA4 batch calls in parallel. */
export async function fetchBehavior(window: ReportWindow): Promise<BehaviorData> {
  const property = getGa4PropertyId();
  const url = ga4BatchUrl(property);
  return cached(`ga4-behavior|${property}|${window.current.from}|${window.current.to}`, async () => {
    const [a, b] = behaviorRequests(window);
    const [batchA, batchB] = await Promise.all([post("Google Analytics", url, a), post("Google Analytics", url, b)]);
    return parseBehavior(batchA, batchB);
  });
}

/** Visits from social networks to the website, in one GA4 batch call. */
export async function fetchSocialTraffic(window: ReportWindow): Promise<SocialTraffic> {
  const property = getGa4PropertyId();
  return cached(`ga4-social|${property}|${window.current.from}|${window.current.to}`, async () =>
    parseSocial(await post("Google Analytics", ga4BatchUrl(property), socialRequest(window))),
  );
}
