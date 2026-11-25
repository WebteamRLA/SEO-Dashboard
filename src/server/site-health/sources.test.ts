import { describe, expect, it } from "vitest";
import { pageKey } from "./crawl";
import { indexBucket, inspectionOrder, parseInspection, summariseIndexing } from "./indexing";
import { mapLimit } from "./pool";
import { parseSitemap, sitemapsFromRobots } from "./sitemap";
import { parsePageSpeed, vitalCategory } from "./speed";

describe("sitemap", () => {
  it("reads a sitemap index and a urlset, ignoring image entries", () => {
    const index = parseSitemap(`<?xml version="1.0"?><sitemapindex><sitemap><loc>https://x.com/post-sitemap1.xml</loc></sitemap></sitemapindex>`);
    expect(index).toEqual({ kind: "index", locs: ["https://x.com/post-sitemap1.xml"] });
    const set = parseSitemap(
      `<urlset><url><loc> https://x.com/a/?p=1&amp;q=2 </loc><image:image><image:loc>https://x.com/i.png</image:loc></image:image></url>` +
        `<url><loc><![CDATA[https://x.com/b/]]></loc></url></urlset>`,
    );
    expect(set).toEqual({ kind: "urlset", locs: ["https://x.com/a/?p=1&q=2", "https://x.com/b/"] });
  });

  it("finds sitemaps in robots.txt", () => {
    expect(sitemapsFromRobots("User-agent: *\nDisallow: /wp-admin/\nSitemap: https://x.com/sitemap_index.xml\r\n")).toEqual([
      "https://x.com/sitemap_index.xml",
    ]);
  });
});

describe("isOnSite", () => {
  it("accepts the site's own host with or without www, and nothing else", async () => {
    const { isOnSite } = await import("./urls");
    expect(isOnSite("https://www.x.com/a/", "x.com")).toBe(true);
    expect(isOnSite("http://x.com/", "x.com")).toBe(true);
    expect(isOnSite("https://evil.com/x.com/", "x.com")).toBe(false);
    expect(isOnSite("https://x.com.evil.com/", "x.com")).toBe(false);
    expect(isOnSite("ftp://x.com/", "x.com")).toBe(false);
  });
});

describe("pageKey", () => {
  it("treats trailing slash, www and host case as the same page", () => {
    expect(pageKey("https://WWW.x.com/a/")).toBe(pageKey("https://x.com/a"));
    expect(pageKey("https://x.com/")).toBe("x.com/");
  });
});

describe("speed", () => {
  it("rates values on Google's thresholds", () => {
    expect(vitalCategory("lcp", 2500)).toBe("good");
    expect(vitalCategory("lcp", 3000)).toBe("needs-improvement");
    expect(vitalCategory("inp", 600)).toBe("poor");
    expect(vitalCategory("cls", 0.1)).toBe("good");
  });

  it("prefers whole-site field data and scales field CLS", () => {
    const result = parsePageSpeed({
      id: "https://x.com/",
      originLoadingExperience: {
        metrics: {
          LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2100 },
          INTERACTION_TO_NEXT_PAINT: { percentile: 140 },
          CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 5 },
        },
      },
      lighthouseResult: {
        finalUrl: "https://x.com/",
        categories: { performance: { score: 0.78 } },
        audits: { "largest-contentful-paint": { numericValue: 3400 }, "cumulative-layout-shift": { numericValue: 0.02 } },
      },
    });
    expect(result).toEqual({
      url: "https://x.com/",
      score: 78,
      field: {
        scope: "origin",
        lcp: { value: 2100, category: "good" },
        inp: { value: 140, category: "good" },
        cls: { value: 0.05, category: "good" },
      },
      lab: { lcp: { value: 3400, category: "needs-improvement" }, cls: { value: 0.02, category: "good" } },
    });
  });

  it("falls back to lab values when Google has no field data, and ignores origin-fallback page data", () => {
    const result = parsePageSpeed({
      loadingExperience: { origin_fallback: true, metrics: { LARGEST_CONTENTFUL_PAINT_MS: { percentile: 1 } } },
      lighthouseResult: { categories: { performance: { score: 0.5 } }, audits: {} },
    });
    expect(result.field).toBeNull();
    expect(result.score).toBe(50);
  });

  it("refuses a response without a score", () => {
    expect(() => parsePageSpeed({})).toThrow(/no performance score/);
  });
});

describe("indexing", () => {
  it("groups Search Console's verdicts", () => {
    expect(indexBucket("PASS", "Submitted and indexed")).toBe("indexed");
    expect(indexBucket("NEUTRAL", "Crawled - currently not indexed")).toBe("crawled-not-indexed");
    expect(indexBucket("NEUTRAL", "Discovered - currently not indexed")).toBe("discovered-not-indexed");
    expect(indexBucket("NEUTRAL", "URL is unknown to Google")).toBe("unknown");
    expect(indexBucket("NEUTRAL", "Page with redirect")).toBe("excluded");
    expect(indexBucket(undefined, undefined)).toBe("unknown");
  });

  it("parses an inspection and counts the buckets", () => {
    const page = parseInspection(
      "https://x.com/a/",
      { inspectionResult: { indexStatusResult: { verdict: "PASS", coverageState: "Submitted and indexed", lastCrawlTime: "2026-11-24T12:29:45Z" } } },
      "2026-11-25T07:00:00Z",
    );
    expect(page).toEqual({
      url: "https://x.com/a/",
      bucket: "indexed",
      coverageState: "Submitted and indexed",
      lastCrawlTime: "2026-11-24T12:29:45Z",
      checkedAt: "2026-11-25T07:00:00Z",
    });
    const summary = summariseIndexing([page, { ...page, url: "https://x.com/b/", bucket: "excluded" }], 2);
    expect(summary.total).toBe(2);
    expect(summary.refreshed).toBe(2);
    expect(summary.counts).toEqual({ indexed: 1, "crawled-not-indexed": 0, "discovered-not-indexed": 0, excluded: 1, unknown: 0 });
  });
});

describe("inspectionOrder", () => {
  it("inspects never-checked pages first, then the stalest", () => {
    const seen = (url: string, checkedAt: string) => [url, { url, bucket: "indexed" as const, coverageState: null, lastCrawlTime: null, checkedAt }] as const;
    const previous = new Map([seen("/old", "2026-11-01T00:00:00Z"), seen("/new", "2026-11-20T00:00:00Z")]);
    expect(inspectionOrder(["/new", "/old", "/never"], previous)).toEqual(["/never", "/old", "/new"]);
  });
});

describe("mapLimit", () => {
  it("keeps order and never runs more than the limit at once", async () => {
    let active = 0;
    let peak = 0;
    const out = await mapLimit([5, 1, 3, 2, 4], 2, async (n) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, n));
      active -= 1;
      return n * 10;
    });
    expect(out).toEqual([50, 10, 30, 20, 40]);
    expect(peak).toBe(2);
  });
});
