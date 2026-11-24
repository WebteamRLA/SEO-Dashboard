import { describe, expect, it } from "vitest";
import {
  ga4BreakdownRequest,
  joinLandingPages,
  parseGa4Breakdown,
  parseKeywords,
  parsePages,
  parseSearchDays,
  searchConsoleBreakdown,
  searchTrend,
  toPath,
  trafficTrend,
  trendUnit,
} from "./analytics";

const window = {
  current: { from: "2026-11-01", to: "2026-11-22" },
  previous: { from: "2026-10-10", to: "2026-10-31" },
  days: 22,
};

describe("searchConsoleBreakdown", () => {
  it("groups by one dimension and includes fresh data", () => {
    expect(searchConsoleBreakdown(window.current, "query", 250)).toEqual({
      startDate: "2026-11-01",
      endDate: "2026-11-22",
      type: "web",
      dimensions: ["query"],
      rowLimit: 250,
      dataState: "all",
    });
  });
});

describe("parseSearchDays", () => {
  it("sorts by date, converts CTR to percent, and nulls CTR/position without impressions", () => {
    const days = parseSearchDays({
      rows: [
        { keys: ["2026-11-02"], clicks: 0, impressions: 0, ctr: 0, position: 0 },
        { keys: ["2026-11-01"], clicks: 3, impressions: 100, ctr: 0.03, position: 12.345 },
      ],
    });
    expect(days).toEqual([
      { date: "2026-11-01", clicks: 3, impressions: 100, ctr: 3, position: 12.3 },
      { date: "2026-11-02", clicks: 0, impressions: 0, ctr: null, position: null },
    ]);
  });

  it("returns an empty list for an empty body", () => {
    expect(parseSearchDays({})).toEqual([]);
    expect(parseSearchDays(null)).toEqual([]);
  });
});

describe("parseKeywords", () => {
  it("computes places gained against the previous period", () => {
    const rows = parseKeywords(
      { rows: [
        { keys: ["seo agency"], clicks: 10, impressions: 200, ctr: 0.05, position: 4 },
        { keys: ["new term"], clicks: 1, impressions: 10, ctr: 0.1, position: 8 },
      ] },
      { rows: [{ keys: ["seo agency"], clicks: 5, impressions: 150, ctr: 0.033, position: 6.5 }] },
    );
    expect(rows[0]).toMatchObject({ query: "seo agency", position: 4, positionChange: 2.5 });
    expect(rows[1]).toMatchObject({ query: "new term", positionChange: null });
  });
});

describe("parsePages", () => {
  it("keeps the full URL", () => {
    expect(parsePages({ rows: [{ keys: ["https://x.com/a/"], clicks: 2, impressions: 40 }] })[0]).toMatchObject({
      url: "https://x.com/a/",
      clicks: 2,
      ctr: 5,
    });
  });
});

describe("ga4BreakdownRequest", () => {
  it("builds three reports within GA4's batch limit", () => {
    const body = ga4BreakdownRequest(window);
    expect(body.requests).toHaveLength(3);
    expect(body.requests[0]!.dateRanges).toHaveLength(2);
    expect(body.requests[2]!.dimensionFilter?.filter.stringFilter.value).toBe("Organic Search");
  });
});

describe("parseGa4Breakdown", () => {
  const body = {
    reports: [
      {
        rows: [
          { dimensionValues: [{ value: "Organic Search" }, { value: "current" }], metricValues: [{ value: "50" }] },
          { dimensionValues: [{ value: "Organic Search" }, { value: "previous" }], metricValues: [{ value: "40" }] },
          { dimensionValues: [{ value: "Referral" }, { value: "current" }], metricValues: [{ value: "7" }] },
          { dimensionValues: [{ value: "Direct" }, { value: "previous" }], metricValues: [{ value: "9" }] },
        ],
      },
      {
        rows: [
          { dimensionValues: [{ value: "20261102" }, { value: "Direct" }], metricValues: [{ value: "4" }] },
          { dimensionValues: [{ value: "20261101" }, { value: "Organic Search" }], metricValues: [{ value: "6" }] },
          { dimensionValues: [{ value: "20261101" }, { value: "Direct" }], metricValues: [{ value: "2" }] },
        ],
      },
      {
        rows: [
          { dimensionValues: [{ value: "/services/" }], metricValues: [{ value: "30" }, { value: "25" }] },
          { dimensionValues: [{ value: "(not set)" }], metricValues: [{ value: "3" }, { value: "3" }] },
        ],
      },
    ],
  };

  it("splits channels by period, ranked by current sessions", () => {
    const result = parseGa4Breakdown(body);
    expect(result.channels).toEqual([
      { channel: "Organic Search", sessions: 50, previousSessions: 40 },
      { channel: "Referral", sessions: 7, previousSessions: 0 },
      { channel: "Direct", sessions: 0, previousSessions: 9 },
    ]);
    expect(result.referral).toEqual({ current: 7, previous: 0 });
  });

  it("sums days across channels and keeps organic separately", () => {
    expect(parseGa4Breakdown(body).daily).toEqual([
      { date: "2026-11-01", sessions: 8, organicSessions: 6 },
      { date: "2026-11-02", sessions: 4, organicSessions: 0 },
    ]);
  });

  it("drops landing pages GA4 could not attribute", () => {
    expect(parseGa4Breakdown(body).landingPages).toEqual([{ path: "/services/", sessions: 30, users: 25 }]);
  });

  it("tolerates an empty response", () => {
    expect(parseGa4Breakdown({})).toEqual({ channels: [], referral: { current: 0, previous: 0 }, daily: [], landingPages: [] });
  });
});

describe("trends", () => {
  it("charts by day up to 92 days, by month beyond", () => {
    expect(trendUnit(92)).toBe("day");
    expect(trendUnit(93)).toBe("month");
  });

  it("re-derives monthly CTR and impression-weighted position", () => {
    const points = searchTrend(
      [
        { date: "2026-10-30", clicks: 1, impressions: 100, ctr: 1, position: 10 },
        { date: "2026-10-31", clicks: 3, impressions: 300, ctr: 1, position: 20 },
      ],
      { from: "2026-10-30", to: "2026-11-01" },
      "month",
    );
    expect(points).toEqual([
      { start: "2026-10-01", unit: "month", clicks: 4, impressions: 400, ctr: 1, position: 17.5 },
      { start: "2026-11-01", unit: "month", clicks: 0, impressions: 0, ctr: null, position: null },
    ]);
  });

  it("keeps one point per day for short periods", () => {
    const points = trafficTrend(
      [
        { date: "2026-11-01", sessions: 5, organicSessions: 2 },
        { date: "2026-11-03", sessions: 7, organicSessions: 3 },
      ],
      { from: "2026-11-01", to: "2026-11-03" },
      "day",
    );
    // The day with no data is a zero, not a gap the line jumps across.
    expect(points.map((p) => [p.start, p.sessions])).toEqual([["2026-11-01", 5], ["2026-11-02", 0], ["2026-11-03", 7]]);
  });
});

describe("landing pages", () => {
  it("reduces URLs to paths", () => {
    expect(toPath("https://rightleftagency.com/blog/x/?utm=1")).toBe("/blog/x/");
    expect(toPath("/blog/x/?a=b")).toBe("/blog/x/");
    expect(toPath("https://rightleftagency.com")).toBe("/");
  });

  it("joins Search Console pages with GA4 organic sessions on the path", () => {
    const rows = joinLandingPages(
      [
        { url: "https://x.com/a/", clicks: 5, impressions: 100, ctr: 5, position: 3 },
        { url: "https://x.com/b/", clicks: 9, impressions: 90, ctr: 10, position: 2 },
      ],
      [
        { path: "/a", sessions: 12, users: 10 },
        { path: "/only-ga4/", sessions: 4, users: 4 },
      ],
    );
    expect(rows).toEqual([
      { path: "/b/", url: "https://x.com/b/", clicks: 9, impressions: 90, organicSessions: null },
      { path: "/a/", url: "https://x.com/a/", clicks: 5, impressions: 100, organicSessions: 12 },
      { path: "/only-ga4/", url: null, clicks: null, impressions: null, organicSessions: 4 },
    ]);
  });
});
