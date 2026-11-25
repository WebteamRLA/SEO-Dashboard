import type { IssuePage, IssuePriority, IssueType, PageFacts, SiteIssueGroup } from "./types";
import { pageKey } from "./urls";

export interface IssueOptions {
  /** A response at or above this many milliseconds counts as slow. Default 3000. */
  slowMs?: number;
  /** A title longer than this many characters is flagged. Default 65. */
  longTitle?: number;
}

interface GroupMeta {
  priority: IssuePriority;
  title: string;
  description: string;
  detailLabel: string | null;
}

/** Issue types the site check itself finds ("not-indexed" comes from the indexing check). */
type CrawlIssueType = Exclude<IssueType, "not-indexed">;

const META: Record<CrawlIssueType, GroupMeta> = {
  "page-error": {
    priority: "high",
    title: "Pages that do not load",
    description: "These pages are in the sitemap but return an error or do not respond. Fix them or take them out of the sitemap.",
    detailLabel: "Problem",
  },
  "broken-link": {
    priority: "high",
    title: "Broken links between pages",
    description: "These pages link to another page on the site that no longer works. Update the link or remove it.",
    detailLabel: "Broken link",
  },
  "sitemap-noindex": {
    priority: "high",
    title: "Sitemap pages hidden from Google",
    description: "These pages are listed in the sitemap but ask Google not to show them. Allow indexing, or remove them from the sitemap.",
    detailLabel: null,
  },
  "missing-title": {
    priority: "high",
    title: "Pages with no title",
    description: "These pages have no title, which is the headline people see in Google results. Add one that describes the page.",
    detailLabel: null,
  },
  "sitemap-redirect": {
    priority: "medium",
    title: "Sitemap lists pages that redirect",
    description: "These sitemap entries send visitors somewhere else. List the final address instead.",
    detailLabel: "Redirect",
  },
  "canonical-elsewhere": {
    priority: "medium",
    title: "Pages that point to another page as the main version",
    description:
      "These pages tell Google a different address is the main one, so they may not appear in results. Check this is intended.",
    detailLabel: "Main version",
  },
  "missing-description": {
    priority: "medium",
    title: "Pages with no description",
    description: "These pages have no short summary for Google results. Write one that encourages people to click.",
    detailLabel: null,
  },
  "missing-h1": {
    priority: "medium",
    title: "Pages with no main heading",
    description: "These pages have no main heading (H1). Add one that says what the page is about.",
    detailLabel: null,
  },
  "duplicate-title": {
    priority: "medium",
    title: "Pages sharing the same title",
    description: "These pages have identical titles, which makes it hard for Google to tell them apart. Give each its own.",
    detailLabel: "Shared title",
  },
  "slow-response": {
    priority: "medium",
    title: "Slow to respond",
    description: "These pages took a long time to start loading. Slow pages lose visitors and can rank lower.",
    detailLabel: "Response time",
  },
  "duplicate-description": {
    priority: "low",
    title: "Pages sharing the same description",
    description: "These pages have identical descriptions in Google results. Give each its own.",
    detailLabel: "Shared description",
  },
  "multiple-h1": {
    priority: "low",
    title: "Pages with more than one main heading",
    description: "These pages have several main headings (H1). Keep one and make the others sub-headings.",
    detailLabel: "Main headings",
  },
  "long-title": {
    priority: "low",
    title: "Titles that are too long",
    description: "These titles are likely to be cut off in Google results. Shorten them.",
    detailLabel: "Length",
  },
  "images-missing-alt": {
    priority: "low",
    title: "Images with no alt text",
    description: "These pages have images with no alt text, which helps people using screen readers and Google understand them.",
    detailLabel: "Images",
  },
};

const PRIORITY_RANK: Record<IssuePriority, number> = { high: 0, medium: 1, low: 2 };

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const isOk = (p: PageFacts) => p.status >= 200 && p.status < 300;
/** A page that loaded as HTML, so its content can be checked. */
const isPage = (p: PageFacts) => isOk(p) && p.isHtml;
const isBroken = (status: number) => status === 0 || status >= 400;
/**
 * Statuses that say "could not check right now", not "this link is broken": no
 * response, rate limited, temporarily unavailable. A firewall throttling the
 * crawler must not turn every menu link into a broken link.
 */
const UNCHECKABLE = new Set([0, 429, 503]);
const isBrokenLink = (status: number) => status >= 400 && !UNCHECKABLE.has(status);

function describeStatus(status: number): string {
  if (status === 0) return "Did not respond";
  if (status >= 500) return `Server error ${status}`;
  return String(status);
}

/**
 * Turns the crawl's per-page facts into the grouped "Issues to fix" list.
 * `linkStatus` covers link targets outside the sitemap; sitemap pages are
 * checked from their own facts, so a redirecting sitemap page is not "broken".
 */
export function buildIssues(
  pages: readonly PageFacts[],
  linkStatus: ReadonlyMap<string, number>,
  options: IssueOptions = {},
): SiteIssueGroup[] {
  const slowMs = options.slowMs ?? 3000;
  const longTitle = options.longTitle ?? 65;

  const found = new Map<CrawlIssueType, IssuePage[]>();
  const add = (type: CrawlIssueType, url: string, detail: string | null = null) => {
    const list = found.get(type) ?? [];
    list.push({ url, detail });
    found.set(type, list);
  };

  const sitemapByKey = new Map<string, PageFacts>();
  for (const page of pages) sitemapByKey.set(pageKey(page.url), page);
  const outsideStatus = new Map<string, number>();
  for (const [url, status] of linkStatus) outsideStatus.set(pageKey(url), status);

  const statusOf = (target: string): number | undefined => {
    const key = pageKey(target);
    return sitemapByKey.get(key)?.status ?? outsideStatus.get(key);
  };

  const titles = new Map<string, string[]>();
  const descriptions = new Map<string, string[]>();
  const push = (map: Map<string, string[]>, key: string, url: string) => map.set(key, [...(map.get(key) ?? []), url]);

  for (const page of pages) {
    if (isBroken(page.status)) add("page-error", page.url, describeStatus(page.status));
    else if (page.status >= 300) add("sitemap-redirect", page.url, page.redirectedTo ? `Redirects to ${page.redirectedTo}` : "Redirects");

    if (isPage(page) && page.responseMs >= slowMs) add("slow-response", page.url, `${(page.responseMs / 1000).toFixed(1)} s`);

    const seen = new Set<string>();
    for (const target of page.internalLinks) {
      const status = statusOf(target);
      if (status === undefined || !isBrokenLink(status) || seen.has(target)) continue;
      seen.add(target);
      add("broken-link", page.url, target);
    }

    if (!isPage(page)) continue;
    if (page.noindex) {
      add("sitemap-noindex", page.url);
      continue;
    }

    if (page.title === null) add("missing-title", page.url);
    else {
      push(titles, page.title, page.url);
      if (page.title.length > longTitle) add("long-title", page.url, `${page.title.length} characters`);
    }
    if (page.metaDescription === null) add("missing-description", page.url);
    else push(descriptions, page.metaDescription, page.url);

    if (page.h1Count === 0) add("missing-h1", page.url);
    else if (page.h1Count > 1) add("multiple-h1", page.url, `${page.h1Count} headings`);

    if (page.canonical !== null && pageKey(page.canonical) !== pageKey(page.url)) add("canonical-elsewhere", page.url, page.canonical);
    if (page.imagesMissingAlt > 0) {
      add("images-missing-alt", page.url, `${page.imagesMissingAlt} ${page.imagesMissingAlt === 1 ? "image" : "images"}`);
    }
  }

  for (const [title, urls] of titles) if (urls.length > 1) for (const url of urls) add("duplicate-title", url, title);
  for (const [text, urls] of descriptions) if (urls.length > 1) for (const url of urls) add("duplicate-description", url, text);

  const groups: SiteIssueGroup[] = [];
  for (const [type, list] of found) {
    if (list.length === 0) continue;
    const meta = META[type];
    groups.push({
      type,
      priority: meta.priority,
      title: meta.title,
      description: meta.description,
      detailLabel: meta.detailLabel,
      pages: list.sort((a, b) => compare(a.url, b.url) || compare(a.detail ?? "", b.detail ?? "")),
    });
  }

  return groups.sort(
    (a, b) =>
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.pages.length - a.pages.length || compare(a.title, b.title),
  );
}
