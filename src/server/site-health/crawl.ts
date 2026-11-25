import { buildIssues } from "./issues";
import { auditPage } from "./page-audit";
import { mapLimit } from "./pool";
import { fetchSitemapUrls, USER_AGENT } from "./sitemap";
import type { CrawlResult, PageFacts } from "./types";
import { isOnSite, pageKey, siteHost } from "./urls";

export { pageKey } from "./urls";

/**
 * The weekly site check: visit every sitemap page, then check the internal
 * links that are not sitemap pages, and turn what was found into issues.
 * Six requests at a time, so the site barely notices. Only the site's own host
 * is ever requested, redirects included.
 */

const CONCURRENCY = 6;
/** Extra link targets checked per run; a site with more is checked in part rather than for an hour. */
const MAX_LINKS = 1500;
/** Larger pages are read only this far: every tag the check needs is near the top or spread through it. */
const MAX_HTML_CHARS = 3_000_000;
/** Redirect hops followed for a link before giving up. */
const MAX_REDIRECTS = 5;

async function fetchPage(url: string): Promise<PageFacts> {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    const responseMs = Date.now() - started;
    const location = response.headers.get("location");
    const isHtml = /text\/html/i.test(response.headers.get("content-type") ?? "");
    const html = response.ok && isHtml ? (await response.text()).slice(0, MAX_HTML_CHARS) : null;
    if (html === null) await response.body?.cancel().catch(() => undefined);
    return auditPage({
      url,
      status: response.status,
      redirectedTo: response.status >= 300 && response.status < 400 && location ? new URL(location, url).href : null,
      responseMs,
      html,
      headers: response.headers,
    });
  } catch {
    return auditPage({ url, status: 0, redirectedTo: null, responseMs: Date.now() - started, html: null, headers: null });
  }
}

/**
 * Final status of a link target. Redirects are followed by hand, and only while
 * they stay on the site: a redirect to another host counts as working (200),
 * since the link does lead somewhere and that host is not ours to probe.
 * HEAD first; some servers only answer GET.
 */
async function linkStatus(url: string, host: string): Promise<number> {
  const request = async (target: string, method: "HEAD" | "GET") => {
    const response = await fetch(target, {
      method,
      redirect: "manual",
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    await response.body?.cancel().catch(() => undefined);
    return response;
  };
  try {
    let target = url;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      let response = await request(target, "HEAD");
      if (response.status === 405 || response.status === 501) response = await request(target, "GET");
      const location = response.headers.get("location");
      if (response.status < 300 || response.status >= 400 || !location) return response.status;
      target = new URL(location, target).href;
      if (!isOnSite(target, host)) return 200;
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Runs the check, stopping new requests at `deadline` (epoch ms). Pages are
 * needed whole: a check that cannot visit every page in time fails rather than
 * store a partial result, whose missing pages would look "fixed". Link checks
 * not reached in time are simply skipped (fewer broken links found, none invented).
 */
export async function runCrawl(siteUrl: string, deadline = Number.POSITIVE_INFINITY): Promise<CrawlResult> {
  const host = siteHost(siteUrl);
  if (!host) throw new Error("The site address is not a valid URL.");
  const urls = await fetchSitemapUrls(siteUrl);
  if (urls.length === 0) throw new Error("No pages found in the site's sitemap.");

  let outOfTime = false;
  const pages = await mapLimit(urls, CONCURRENCY, async (url) => {
    if (Date.now() >= deadline) {
      outOfTime = true;
      return null;
    }
    return fetchPage(url);
  });
  if (outOfTime) throw new Error(`The site check ran out of time after ${pages.filter(Boolean).length} of ${urls.length} pages.`);
  const visited = pages.filter((page): page is PageFacts => page !== null);

  const inSitemap = new Set(visited.map((page) => pageKey(page.url)));
  const targets = [...new Set(visited.flatMap((page) => page.internalLinks))]
    .filter((link) => isOnSite(link, host) && !inSitemap.has(pageKey(link)))
    .slice(0, MAX_LINKS);
  const statuses = await mapLimit(targets, CONCURRENCY, async (link) => (Date.now() >= deadline ? null : linkStatus(link, host)));
  const linkStatuses = new Map<string, number>();
  targets.forEach((link, index) => {
    const status = statuses[index];
    if (status !== null && status !== undefined) linkStatuses.set(link, status);
  });

  return {
    pagesChecked: visited.length,
    linksChecked: linkStatuses.size,
    issues: buildIssues(visited, linkStatuses),
    okPages: visited.filter((page) => page.isHtml && page.status >= 200 && page.status < 300).map((page) => page.url),
  };
}
