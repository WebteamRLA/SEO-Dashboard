/**
 * Shared shapes for Site health: what each job stores (SiteHealthRun.result)
 * and what the page reads. Pure types, safe to import from client code.
 */

// ---------------------------------------------------------------- Weekly site check (crawl)

/** What the site check reads from one page. Produced by auditPage() in page-audit.ts. */
export interface PageFacts {
  /** The URL as listed in the sitemap. */
  url: string;
  /** HTTP status of the first response (before following any redirect). 0 when the request failed. */
  status: number;
  /** The response was an HTML page whose body was read. A PDF or image in the sitemap is not. */
  isHtml: boolean;
  /** Where a 3xx response pointed, absolute. Null when it did not redirect. */
  redirectedTo: string | null;
  /** Milliseconds until the first response arrived. */
  responseMs: number;
  /** Trimmed text of the first <title>, entities decoded. Null when there is none or it is empty. */
  title: string | null;
  /** Trimmed content of <meta name="description">. Null when missing or empty. */
  metaDescription: string | null;
  /** Number of <h1> elements. */
  h1Count: number;
  /** A robots meta tag or X-Robots-Tag header contains "noindex". */
  noindex: boolean;
  /** Absolute href of <link rel="canonical">, or null. */
  canonical: string | null;
  /** <img> elements with no alt attribute (alt="" counts as present: decorative images). */
  imagesMissingAlt: number;
  /** Absolute same-site links found in <a href>, fragment removed, deduplicated. */
  internalLinks: string[];
}

export type IssuePriority = "high" | "medium" | "low";

export type IssueType =
  | "page-error"
  | "broken-link"
  | "sitemap-noindex"
  | "missing-title"
  | "sitemap-redirect"
  | "canonical-elsewhere"
  | "missing-description"
  | "missing-h1"
  | "duplicate-title"
  | "slow-response"
  | "duplicate-description"
  | "multiple-h1"
  | "long-title"
  | "images-missing-alt"
  /** Not from the site check: pages the indexing check found Google has seen but not indexed. */
  | "not-indexed";

/** One affected page, with what is wrong on it when that helps (the broken link, the redirect target…). */
export interface IssuePage {
  url: string;
  detail: string | null;
}

export interface SiteIssueGroup {
  type: IssueType;
  priority: IssuePriority;
  /** Short plain-language name, e.g. "Broken internal links". */
  title: string;
  /** One sentence on why it matters / what to do. */
  description: string;
  /** Column name for IssuePage.detail in the expanded view, e.g. "Broken link". Null when details are not used. */
  detailLabel: string | null;
  pages: IssuePage[];
}

export interface CrawlResult {
  /** The sitemap URLs the check visited. */
  pagesChecked: number;
  /** Extra internal link targets (not in the sitemap) whose status was checked. */
  linksChecked: number;
  /** Most important first: priority, then number of pages affected. */
  issues: SiteIssueGroup[];
  /**
   * Sitemap pages that loaded as HTML, so every check ran on them. An issue on a
   * page missing here was not re-checked and must not count as fixed. Absent in
   * runs stored before it was added.
   */
  okPages?: string[];
}

// ---------------------------------------------------------------- Indexing (URL Inspection)

export type IndexBucket = "indexed" | "crawled-not-indexed" | "discovered-not-indexed" | "excluded" | "unknown";

export interface IndexedPage {
  url: string;
  bucket: IndexBucket;
  /** Search Console's own wording, e.g. "Submitted and indexed". */
  coverageState: string | null;
  lastCrawlTime: string | null;
  /** When this page was last inspected. Null when it never has been. */
  checkedAt: string | null;
}

export interface IndexingResult {
  /** Pages in the sitemap when the check ran. */
  total: number;
  counts: Record<IndexBucket, number>;
  pages: IndexedPage[];
  /** Pages inspected in this run; the rest carry their previous result. */
  refreshed: number;
}

// ---------------------------------------------------------------- Speed (PageSpeed Insights)

export type VitalCategory = "good" | "needs-improvement" | "poor";

export interface Vital {
  /** p75 value: milliseconds for LCP and INP, a unitless score for CLS. */
  value: number;
  category: VitalCategory;
}

export interface SpeedResult {
  /** The page tested (the home page). */
  url: string;
  /** Lighthouse mobile performance score, 0–100. */
  score: number;
  /**
   * Real-visitor (Chrome UX Report) p75 values for the whole site over the last
   * 28 days, or for the page when the site has too little traffic. Null when
   * Google has no field data at all.
   */
  field: {
    scope: "origin" | "page";
    lcp: Vital | null;
    inp: Vital | null;
    cls: Vital | null;
  } | null;
  /** Lab (Lighthouse) values, used when there is no field data. INP has no lab equivalent. */
  lab: { lcp: Vital | null; cls: Vital | null };
}

export type SiteHealthKind = "speed" | "indexing" | "crawl";
