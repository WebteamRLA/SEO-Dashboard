import { mapLimit } from "./pool";
import type { IndexBucket, IndexedPage, IndexingResult } from "./types";

/**
 * Whether Google has indexed each sitemap page, from Search Console's URL
 * Inspection API. Bucketing is pure and tested; inspectPages() does the network.
 * The API allows 2,000 inspections a day and 600 a minute per property.
 */

interface InspectionResponse {
  inspectionResult?: {
    indexStatusResult?: { verdict?: string; coverageState?: string; lastCrawlTime?: string };
  };
}

/** Search Console's verdict and coverage wording, grouped the way the page shows them. */
export function indexBucket(verdict: string | undefined, coverageState: string | undefined): IndexBucket {
  if (verdict === "PASS") return "indexed";
  const state = (coverageState ?? "").toLowerCase();
  if (state.startsWith("crawled")) return "crawled-not-indexed";
  if (state.startsWith("discovered")) return "discovered-not-indexed";
  if (!state || state.includes("unknown to google")) return "unknown";
  return "excluded";
}

export function parseInspection(url: string, body: unknown, checkedAt: string): IndexedPage {
  const status = (body as InspectionResponse | null)?.inspectionResult?.indexStatusResult;
  return {
    url,
    bucket: indexBucket(status?.verdict, status?.coverageState),
    coverageState: status?.coverageState ?? null,
    lastCrawlTime: status?.lastCrawlTime ?? null,
    checkedAt,
  };
}

export function summariseIndexing(pages: readonly IndexedPage[], refreshed: number): IndexingResult {
  const counts: Record<IndexBucket, number> = { indexed: 0, "crawled-not-indexed": 0, "discovered-not-indexed": 0, excluded: 0, unknown: 0 };
  for (const page of pages) counts[page.bucket] += 1;
  return { total: pages.length, counts, pages: [...pages], refreshed };
}

/**
 * The order to inspect in: pages never inspected first, then those inspected
 * longest ago. A run that runs out of time therefore refreshes the stalest pages.
 */
export function inspectionOrder(urls: readonly string[], previous: ReadonlyMap<string, IndexedPage>): string[] {
  const stamp = (url: string) => previous.get(url)?.checkedAt ?? "";
  return [...urls].sort((a, b) => stamp(a).localeCompare(stamp(b)));
}

const INSPECT_URL = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
/** Inspections in flight at once. Each takes several seconds; Google allows 600 a minute. */
const CONCURRENCY = 20;

/**
 * Inspects the sitemap pages until `deadline` (epoch ms), stalest first. Pages
 * not reached, or whose inspection fails, keep their previous result, so the
 * figures always cover the whole sitemap. Throws when not a single inspection
 * succeeds, with the first error, so the page can say why.
 */
export async function inspectPages(
  urls: readonly string[],
  siteUrl: string,
  token: () => Promise<string>,
  { previous = [], deadline = Number.POSITIVE_INFINITY }: { previous?: readonly IndexedPage[]; deadline?: number } = {},
): Promise<IndexingResult> {
  const before = new Map(previous.map((page) => [page.url, page]));
  const carried = (url: string): IndexedPage =>
    before.get(url) ?? { url, bucket: "unknown", coverageState: null, lastCrawlTime: null, checkedAt: null };

  let firstError: string | null = null;
  let refreshed = 0;
  const inspected = await mapLimit(inspectionOrder(urls, before), CONCURRENCY, async (url) => {
    if (Date.now() >= deadline) return carried(url);
    try {
      const response = await fetch(INSPECT_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inspectionUrl: url, siteUrl }),
        signal: AbortSignal.timeout(30_000),
        cache: "no-store",
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const message = (body as { error?: { message?: string } } | null)?.error?.message ?? "";
        firstError ??= `Search Console URL Inspection returned ${response.status}${message ? `: ${message}` : ""}`;
        return carried(url);
      }
      refreshed += 1;
      return parseInspection(url, body, new Date().toISOString());
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      firstError ??= `Search Console URL Inspection failed: ${reason}`;
      return carried(url);
    }
  });
  if (refreshed === 0 && firstError) throw new Error(firstError);

  // Back to sitemap order, so stored results read naturally.
  const byUrl = new Map(inspected.map((page) => [page.url, page]));
  return summariseIndexing(urls.map((url) => byUrl.get(url) ?? carried(url)), refreshed);
}
