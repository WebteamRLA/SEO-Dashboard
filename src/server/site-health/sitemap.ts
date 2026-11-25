import { isOnSite, siteHost } from "./urls";

/**
 * The site's page list, from its XML sitemap (robots.txt → sitemap index →
 * sitemaps). Parsing is pure and tested; fetchSitemapUrls() does the network.
 */

const LOC = /<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]]+?)\s*(?:\]\]>)?\s*<\/loc>/gi;

/** Sitemap files never list more than this, so a runaway sitemap cannot run the check for hours. */
export const MAX_SITEMAP_URLS = 2000;

const decode = (value: string) =>
  value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");

/**
 * The <loc> entries of a sitemap or sitemap index. An index lists further
 * sitemaps; a urlset lists pages. Image entries (<image:loc>) are not pages and
 * are ignored.
 */
export function parseSitemap(xml: string): { kind: "index" | "urlset"; locs: string[] } {
  const kind = /<sitemapindex[\s>]/i.test(xml) ? "index" : "urlset";
  const locs: string[] = [];
  for (const match of xml.matchAll(LOC)) {
    const value = decode(match[1] ?? "").trim();
    if (value) locs.push(value);
  }
  return { kind, locs };
}

/** "Sitemap:" lines in robots.txt. */
export function sitemapsFromRobots(robots: string): string[] {
  return robots
    .split(/\r?\n/)
    .map((line) => /^\s*sitemap\s*:\s*(\S+)/i.exec(line)?.[1])
    .filter((value): value is string => Boolean(value));
}

/** Identifies the dashboard to the site's logs and firewall. */
export const USER_AGENT = "RLA-SiteCheck/1.0 (+https://seo.rightleftagency.com)";

async function getText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

/**
 * Every page URL in the site's sitemaps, deduplicated, in sitemap order. Looks
 * for sitemaps in robots.txt, then at /sitemap_index.xml and /sitemap.xml. Only
 * sitemaps and pages on the site's own host are used: the checks never request
 * another host, whatever a sitemap lists.
 */
export async function fetchSitemapUrls(siteUrl: string): Promise<string[]> {
  const origin = new URL(siteUrl).origin;
  const host = siteHost(siteUrl) ?? "";
  const robots = await getText(`${origin}/robots.txt`);
  const queue = robots ? sitemapsFromRobots(robots).filter((url) => isOnSite(url, host)) : [];
  if (queue.length === 0) queue.push(`${origin}/sitemap_index.xml`, `${origin}/sitemap.xml`);

  const seenMaps = new Set<string>();
  const pages = new Set<string>();
  while (queue.length > 0 && pages.size < MAX_SITEMAP_URLS && seenMaps.size < 50) {
    const map = queue.shift()!;
    if (seenMaps.has(map)) continue;
    seenMaps.add(map);
    const xml = await getText(map);
    if (!xml) continue;
    const { kind, locs } = parseSitemap(xml);
    const onSite = locs.filter((loc) => isOnSite(loc, host));
    if (kind === "index") queue.push(...onSite);
    // Both fallback sitemaps may list the same pages; the set keeps each once.
    else for (const loc of onSite) if (pages.size < MAX_SITEMAP_URLS) pages.add(loc);
  }
  return [...pages];
}
