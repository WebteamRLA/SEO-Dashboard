import { describe, expect, it } from "vitest";
import { buildIssues } from "./issues";
import type { IssueType, PageFacts } from "./types";

const BASE = "https://rightleftagency.com";

function page(path: string, over: Partial<PageFacts> = {}): PageFacts {
  return {
    url: `${BASE}${path}`,
    status: 200,
    isHtml: true,
    redirectedTo: null,
    responseMs: 400,
    title: `Title of ${path}`,
    metaDescription: `Description of ${path}`,
    h1Count: 1,
    noindex: false,
    canonical: null,
    imagesMissingAlt: 0,
    internalLinks: [],
    ...over,
  };
}

const none = new Map<string, number>();
const group = (groups: ReturnType<typeof buildIssues>, type: IssueType) => groups.find((g) => g.type === type);

describe("buildIssues", () => {
  it("returns nothing for healthy pages", () => {
    expect(buildIssues([page("/a/"), page("/b/", { canonical: `${BASE}/b/` })], none)).toEqual([]);
  });

  it("reports pages that do not load", () => {
    const g = group(
      buildIssues([page("/gone/", { status: 404 }), page("/boom/", { status: 503 }), page("/down/", { status: 0 }), page("/ok/")], none),
      "page-error",
    );
    expect(g).toMatchObject({ priority: "high", detailLabel: "Problem" });
    expect(g?.pages).toEqual([
      { url: `${BASE}/boom/`, detail: "Server error 503" },
      { url: `${BASE}/down/`, detail: "Did not respond" },
      { url: `${BASE}/gone/`, detail: "404" },
    ]);
  });

  it("reports broken links per page and target pair, using linkStatus for outside pages", () => {
    const a = page("/a/", { internalLinks: [`${BASE}/old/`, `${BASE}/fine/`, `${BASE}/dead/`] });
    const b = page("/b/", { internalLinks: [`${BASE}/old/`] });
    const status = new Map([
      [`${BASE}/old/`, 404],
      [`${BASE}/fine/`, 200],
      [`${BASE}/dead/`, 500],
    ]);
    const g = group(buildIssues([b, a], status), "broken-link");
    expect(g?.detailLabel).toBe("Broken link");
    expect(g?.pages).toEqual([
      { url: `${BASE}/a/`, detail: `${BASE}/dead/` },
      { url: `${BASE}/a/`, detail: `${BASE}/old/` },
      { url: `${BASE}/b/`, detail: `${BASE}/old/` },
    ]);
  });

  it("does not call a link broken when it could not be checked (no response, rate limited, unavailable)", () => {
    const a = page("/a/", { internalLinks: [`${BASE}/x/`, `${BASE}/y/`, `${BASE}/z/`, `${BASE}/timed-out/`] });
    const status = new Map([
      [`${BASE}/x/`, 0],
      [`${BASE}/y/`, 429],
      [`${BASE}/z/`, 503],
    ]);
    const timedOut = page("/timed-out/", { status: 0, isHtml: false });
    expect(group(buildIssues([a, timedOut], status), "broken-link")).toBeUndefined();
  });

  it("does not run content checks on a sitemap entry that is not an HTML page", () => {
    const pdf = page("/brochure.pdf", { isHtml: false, title: null, metaDescription: null, h1Count: 0 });
    const groups = buildIssues([pdf], none);
    expect(groups.map((g) => g.type)).toEqual([]);
  });

  it("matches link targets to sitemap pages ignoring trailing slash, and uses their own status", () => {
    const target = page("/missing", { status: 404 });
    const linker = page("/a/", { internalLinks: [`${BASE}/missing/`] });
    expect(group(buildIssues([linker, target], none), "broken-link")?.pages).toEqual([{ url: `${BASE}/a/`, detail: `${BASE}/missing/` }]);
  });

  it("matches linkStatus entries with a different trailing slash", () => {
    const linker = page("/a/", { internalLinks: [`${BASE}/old/`] });
    expect(group(buildIssues([linker], new Map([[`${BASE}/old`, 410]])), "broken-link")?.pages).toHaveLength(1);
  });

  it("does not treat a redirecting sitemap page as a broken link", () => {
    const redirecting = page("/moved/", { status: 301, redirectedTo: `${BASE}/new/` });
    const linker = page("/a/", { internalLinks: [`${BASE}/moved/`] });
    const groups = buildIssues([linker, redirecting], none);
    expect(group(groups, "broken-link")).toBeUndefined();
    expect(group(groups, "sitemap-redirect")?.pages).toEqual([{ url: `${BASE}/moved/`, detail: `Redirects to ${BASE}/new/` }]);
  });

  it("does not report a link whose status is unknown", () => {
    expect(buildIssues([page("/a/", { internalLinks: [`${BASE}/unknown/`] })], none)).toEqual([]);
  });

  it("reports sitemap pages that are noindex, and skips their content checks", () => {
    const hidden = page("/hidden/", { noindex: true, title: null, metaDescription: null, h1Count: 0 });
    const groups = buildIssues([hidden], none);
    expect(groups.map((g) => g.type)).toEqual(["sitemap-noindex"]);
    expect(groups[0]).toMatchObject({ priority: "high", pages: [{ url: `${BASE}/hidden/`, detail: null }] });
  });

  it("reports missing title, description and h1 only for 2xx pages", () => {
    const bare = page("/bare/", { title: null, metaDescription: null, h1Count: 0 });
    const errored = page("/err/", { status: 500, title: null, metaDescription: null, h1Count: 0 });
    const groups = buildIssues([bare, errored], none);
    expect(group(groups, "missing-title")).toMatchObject({ priority: "high", pages: [{ url: `${BASE}/bare/`, detail: null }] });
    expect(group(groups, "missing-description")?.pages).toHaveLength(1);
    expect(group(groups, "missing-h1")?.pages).toHaveLength(1);
    expect(group(groups, "page-error")?.pages).toHaveLength(1);
  });

  it("reports canonical pointing elsewhere but ignores slash, scheme and www differences", () => {
    const groups = buildIssues(
      [
        page("/same", { canonical: `${BASE}/same/` }),
        page("/www/", { canonical: "http://www.rightleftagency.com/www/" }),
        page("/other/", { canonical: `${BASE}/main/` }),
      ],
      none,
    );
    expect(group(groups, "canonical-elsewhere")?.pages).toEqual([{ url: `${BASE}/other/`, detail: `${BASE}/main/` }]);
  });

  it("reports duplicate titles and descriptions across indexable 2xx pages", () => {
    const groups = buildIssues(
      [
        page("/a/", { title: "Same", metaDescription: "Same desc" }),
        page("/b/", { title: "Same", metaDescription: "Same desc" }),
        page("/c/", { title: "Same", noindex: true }),
        page("/d/", { title: "Same", status: 301, redirectedTo: `${BASE}/a/` }),
        page("/e/"),
      ],
      none,
    );
    expect(group(groups, "duplicate-title")).toMatchObject({
      priority: "medium",
      pages: [
        { url: `${BASE}/a/`, detail: "Same" },
        { url: `${BASE}/b/`, detail: "Same" },
      ],
    });
    expect(group(groups, "duplicate-description")).toMatchObject({ priority: "low", pages: [{ detail: "Same desc" }, { detail: "Same desc" }] });
  });

  it("reports slow responses with the time in seconds", () => {
    const g = group(buildIssues([page("/slow/", { responseMs: 4200 }), page("/edge/", { responseMs: 3000 }), page("/fast/", { responseMs: 2999 })], none), "slow-response");
    expect(g?.pages).toEqual([
      { url: `${BASE}/edge/`, detail: "3.0 s" },
      { url: `${BASE}/slow/`, detail: "4.2 s" },
    ]);
    expect(group(buildIssues([page("/x/", { responseMs: 1500 })], none, { slowMs: 1000 }), "slow-response")).toBeDefined();
  });

  it("reports multiple h1, long titles and missing alt text", () => {
    const long = "x".repeat(66);
    const groups = buildIssues(
      [
        page("/h/", { h1Count: 3, imagesMissingAlt: 5 }),
        page("/i/", { imagesMissingAlt: 1 }),
        page("/t/", { title: long }),
        page("/t65/", { title: "y".repeat(65) }),
      ],
      none,
    );
    expect(group(groups, "multiple-h1")?.pages).toEqual([{ url: `${BASE}/h/`, detail: "3 headings" }]);
    expect(group(groups, "long-title")?.pages).toEqual([{ url: `${BASE}/t/`, detail: "66 characters" }]);
    expect(group(groups, "images-missing-alt")?.pages).toEqual([
      { url: `${BASE}/h/`, detail: "5 images" },
      { url: `${BASE}/i/`, detail: "1 image" },
    ]);
    expect(group(buildIssues([page("/t65/", { title: "y".repeat(65) })], none, { longTitle: 60 }), "long-title")).toBeDefined();
  });

  it("orders groups by priority, then page count, then title, and pages by url", () => {
    const groups = buildIssues(
      [
        page("/z/", { h1Count: 0, imagesMissingAlt: 1 }),
        page("/y/", { h1Count: 0, responseMs: 5000 }),
        page("/x/", { title: null, h1Count: 0 }),
        page("/w/", { status: 404 }),
      ],
      none,
    );
    expect(groups.map((g) => `${g.priority}:${g.type}:${g.pages.length}`)).toEqual([
      "high:page-error:1",
      "high:missing-title:1",
      "medium:missing-h1:3",
      "medium:slow-response:1",
      "low:images-missing-alt:1",
    ]);
    expect(group(groups, "missing-h1")?.pages.map((p) => p.url)).toEqual([`${BASE}/x/`, `${BASE}/y/`, `${BASE}/z/`]);
  });

  it("is deterministic regardless of input order", () => {
    const input = [page("/a/", { h1Count: 0 }), page("/b/", { h1Count: 0, status: 404 }), page("/c/", { title: null })];
    expect(buildIssues([...input].reverse(), none)).toEqual(buildIssues(input, none));
  });
});
