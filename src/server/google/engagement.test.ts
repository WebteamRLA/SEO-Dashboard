import { describe, expect, it } from "vitest";
import { behaviorRequests, parseBehavior, parseSocial, platformOf, socialRequest, socialTrend } from "./engagement";

const window = {
  current: { from: "2026-11-01", to: "2026-11-22" },
  previous: { from: "2026-10-10", to: "2026-10-31" },
  days: 22,
};
const row = (dims: string[], metrics: number[]) => ({
  dimensionValues: dims.map((value) => ({ value })),
  metricValues: metrics.map((value) => ({ value: String(value) })),
});

describe("behaviorRequests", () => {
  it("stays within GA4's five reports per batch", () => {
    const [a, b] = behaviorRequests(window);
    expect(a!.requests.length).toBeLessThanOrEqual(5);
    expect(b!.requests.length).toBeLessThanOrEqual(5);
    expect(a!.requests[0]!.dateRanges).toHaveLength(2);
  });
});

describe("parseBehavior", () => {
  const batchA = {
    reports: [
      { rows: [row(["current"], [200, 80, 4000, 300, 6]), row(["previous"], [100, 50, 3000, 120, 2])] },
      { rows: [row(["/a/"], [100, 3000]), row(["(not set)"], [5, 0]), row(["/b/"], [0, 0])] },
      { rows: [row(["/a/"], [25])] },
      { rows: [row(["/contact"], [20, 4, 0.2])] },
    ],
  };
  const batchB = {
    reports: [
      { rows: [row(["contact_page_form_submit"], [4])] },
      { rows: [row(["desktop"], [150, 60]), row(["mobile"], [50, 20])] },
    ],
  };
  const data = parseBehavior(batchA, batchB);

  it("derives engagement rate, time per session and views per session", () => {
    expect(data.totals.current).toEqual({ sessions: 200, engagementRate: 40, engagementSeconds: 20, viewsPerSession: 1.5, keyEvents: 6 });
    expect(data.totals.previous.engagementRate).toBe(50);
  });

  it("joins scroll events to pages as a read-to-end share and drops (not set)", () => {
    expect(data.pages).toEqual([
      { path: "/a/", views: 100, secondsPerView: 30, readToEnd: 25 },
      { path: "/b/", views: 0, secondsPerView: null, readToEnd: null },
    ]);
  });

  it("converts the key event rate to percent", () => {
    expect(data.enquiryPages).toEqual([{ path: "/contact", sessions: 20, keyEvents: 4, conversionRate: 20 }]);
  });

  it("reads key events and devices", () => {
    expect(data.keyEvents).toEqual([{ event: "contact_page_form_submit", count: 4 }]);
    expect(data.devices[1]).toEqual({ device: "mobile", sessions: 50, engagementRate: 40 });
  });

  it("tolerates empty responses", () => {
    const empty = parseBehavior({}, null);
    expect(empty.totals.current).toEqual({ sessions: 0, engagementRate: null, engagementSeconds: null, viewsPerSession: null, keyEvents: 0 });
    expect(empty.pages).toEqual([]);
  });
});

describe("social", () => {
  it("groups referrer hosts into platforms", () => {
    expect(platformOf("m.facebook.com")).toBe("Facebook");
    expect(platformOf("l.facebook.com")).toBe("Facebook");
    expect(platformOf("meta")).toBe("Facebook");
    expect(platformOf("l.messenger.com")).toBe("Facebook");
    expect(platformOf("lnkd.in")).toBe("LinkedIn");
    expect(platformOf("linkedin.com")).toBe("LinkedIn");
    expect(platformOf("l.instagram.com")).toBe("Instagram");
    expect(platformOf("t.co")).toBe("X (Twitter)");
    expect(platformOf("mastodon.social")).toBe("mastodon.social");
  });

  it("filters to social channels", () => {
    const body = socialRequest(window);
    expect(body.requests).toHaveLength(4);
    expect(body.requests[0]!.dimensionFilter.filter.inListFilter.values).toEqual(["Organic Social", "Paid Social"]);
  });

  it("merges sources per platform and period", () => {
    const data = parseSocial({
      reports: [
        { rows: [row(["current"], [10, 4, 1]), row(["previous"], [6, 2, 0])] },
        {
          rows: [
            row(["facebook.com", "current"], [3, 1, 0]),
            row(["m.facebook.com", "current"], [2, 1, 1]),
            row(["linkedin.com", "previous"], [6, 2, 0]),
          ],
        },
        { rows: [row(["/"], [5, 1])] },
        { rows: [row(["20261102"], [4]), row(["20261101"], [6])] },
      ],
    });
    expect(data.totals.current).toEqual({ sessions: 10, engagedSessions: 4, keyEvents: 1 });
    expect(data.platforms).toEqual([
      { platform: "Facebook", sessions: 5, previousSessions: 0, engagedSessions: 2, keyEvents: 1 },
      { platform: "LinkedIn", sessions: 0, previousSessions: 6, engagedSessions: 0, keyEvents: 0 },
    ]);
    expect(data.daily.map((d) => d.date)).toEqual(["2026-11-01", "2026-11-02"]);
  });
});

describe("socialTrend", () => {
  it("fills days without visits with zero", () => {
    const points = socialTrend([{ date: "2026-11-02", sessions: 3 }], { from: "2026-11-01", to: "2026-11-03" }, "day");
    expect(points.map((p) => p.sessions)).toEqual([0, 3, 0]);
  });
});
