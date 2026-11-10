import { describe, expect, it } from "vitest";
import {
  ga4BatchRequest,
  normalizePropertyId,
  parseGa4Batch,
  parseSearchConsole,
  reportWindow,
  searchConsolePath,
} from "./reports";
import { percentChange } from "@/lib/domain/change";

describe("reportWindow", () => {
  it("ends a period that includes today at yesterday, and compares the same number of days", () => {
    expect(reportWindow({ from: "2026-11-01", to: "2026-11-30" }, "2026-11-10")).toEqual({
      current: { from: "2026-11-01", to: "2026-11-09" },
      previous: { from: "2026-10-23", to: "2026-10-31" },
      days: 9,
    });
  });

  it("keeps a past period whole", () => {
    expect(reportWindow({ from: "2026-10-01", to: "2026-10-31" }, "2026-11-10")).toEqual({
      current: { from: "2026-10-01", to: "2026-10-31" },
      previous: { from: "2026-08-31", to: "2026-09-30" },
      days: 31,
    });
  });

  it("handles a single day and crosses a year boundary", () => {
    expect(reportWindow({ from: "2026-01-01", to: "2026-01-01" }, "2026-01-02")).toEqual({
      current: { from: "2026-01-01", to: "2026-01-01" },
      previous: { from: "2025-12-31", to: "2025-12-31" },
      days: 1,
    });
  });

  it("is null when no day of the period is complete", () => {
    expect(reportWindow({ from: "2026-11-01", to: "2026-11-30" }, "2026-11-01")).toBeNull();
    expect(reportWindow({ from: "2026-12-01", to: "2026-12-31" }, "2026-11-10")).toBeNull();
  });
});

describe("parseSearchConsole", () => {
  it("reads the aggregated row and converts CTR to percent", () => {
    expect(
      parseSearchConsole({ rows: [{ clicks: 120, impressions: 4000, ctr: 0.03, position: 14.348 }] }),
    ).toEqual({ clicks: 120, impressions: 4000, ctr: 3, position: 14.3 });
  });

  it("returns zeros and nulls when Google has no rows", () => {
    expect(parseSearchConsole({})).toEqual({ clicks: 0, impressions: 0, ctr: null, position: null });
    expect(parseSearchConsole(null)).toEqual({ clicks: 0, impressions: 0, ctr: null, position: null });
  });

  it("encodes domain and URL properties for the path", () => {
    expect(searchConsolePath("sc-domain:example.com")).toBe(
      "/webmasters/v3/sites/sc-domain%3Aexample.com/searchAnalytics/query",
    );
    expect(searchConsolePath("https://www.example.com/")).toBe(
      "/webmasters/v3/sites/https%3A%2F%2Fwww.example.com%2F/searchAnalytics/query",
    );
  });
});

describe("GA4", () => {
  const window = reportWindow({ from: "2026-10-01", to: "2026-10-31" }, "2026-11-10")!;

  it("asks for all traffic and organic traffic over both named ranges", () => {
    const body = ga4BatchRequest(window);
    expect(body.requests).toHaveLength(2);
    expect(body.requests[0]!.dateRanges).toEqual([
      { startDate: "2026-10-01", endDate: "2026-10-31", name: "current" },
      { startDate: "2026-08-31", endDate: "2026-09-30", name: "previous" },
    ]);
    expect(body.requests[1]).toMatchObject({
      dimensionFilter: { filter: { fieldName: "sessionDefaultChannelGroup", stringFilter: { value: "Organic Search" } } },
    });
  });

  it("matches rows by range name, whatever order GA4 returns them in", () => {
    const row = (name: string, sessions: string, users: string) => ({
      dimensionValues: [{ value: name }],
      metricValues: [{ value: sessions }, { value: users }],
    });
    const result = parseGa4Batch({
      reports: [
        { rows: [row("previous", "900", "700"), row("current", "1000", "800")] },
        { rows: [row("current", "450", "380")] },
      ],
    });
    expect(result).toEqual({
      current: { sessions: 1000, users: 800, organicSessions: 450, organicUsers: 380 },
      previous: { sessions: 900, users: 700, organicSessions: 0, organicUsers: 0 },
    });
  });

  it("returns zeros for an empty response", () => {
    const zero = { sessions: 0, users: 0, organicSessions: 0, organicUsers: 0 };
    expect(parseGa4Batch({})).toEqual({ current: zero, previous: zero });
  });

  it("normalizes property IDs", () => {
    expect(normalizePropertyId("123456789")).toBe("123456789");
    expect(normalizePropertyId(" properties/123456789 ")).toBe("123456789");
    expect(normalizePropertyId("G-ABC123")).toBeNull();
  });
});

describe("percentChange", () => {
  it("rounds, and has no value without a base", () => {
    expect(percentChange(115, 100)).toBe(15);
    expect(percentChange(50, 200)).toBe(-75);
    expect(percentChange(10, 0)).toBeNull();
  });
});
