import "server-only";
import { fetchAccessToken, type AccessToken } from "./credentials";
import { getGa4PropertyId, getSearchConsoleSite, getServiceAccount } from "./config";
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

const cache = new Map<string, { at: number; ttl: number; promise: Promise<unknown> }>();

/**
 * Caches the promise, so identical requests in flight share one call. A
 * success is kept for REPORT_TTL_MS, a failure for FAILURE_TTL_MS.
 */
function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.promise as Promise<T>;
  const entry = { at: Date.now(), ttl: REPORT_TTL_MS, promise: load() as Promise<unknown> };
  entry.promise.catch(() => {
    entry.at = Date.now();
    entry.ttl = FAILURE_TTL_MS;
  });
  cache.set(key, entry);
  // Bounded: one entry per period people have looked at in the last few minutes.
  if (cache.size > 100) cache.delete(cache.keys().next().value as string);
  return entry.promise as Promise<T>;
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
