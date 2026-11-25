import { describe, expect, it } from "vitest";
import {
  AI_CHANNEL,
  channelOf,
  isAiSource,
  parseTrafficOverview,
  trafficOverviewRequests,
} from "./traffic-overview";

const row = (dims: string[], metrics: number[]) => ({
  dimensionValues: dims.map((value) => ({ value })),
  metricValues: metrics.map((value) => ({ value: String(value) })),
});

const window = {
  current: { from: "2026-11-01", to: "2026-11-24" },
  previous: { from: "2026-10-08", to: "2026-10-31" },
  days: 24,
};

describe("AI sources", () => {
  it("recognises AI assistants by session source", () => {
    expect(isAiSource("chatgpt.com")).toBe(true);
    expect(isAiSource("chat.openai.com")).toBe(true);
    expect(isAiSource("perplexity.ai")).toBe(true);
    expect(isAiSource("gemini.google.com")).toBe(true);
    expect(isAiSource("copilot.microsoft.com")).toBe(true);
    expect(isAiSource("chat.mistral.ai")).toBe(true);
    expect(isAiSource("ChatGPT")).toBe(true);
    expect(isAiSource("google")).toBe(false);
    expect(isAiSource("linkedin.com")).toBe(false);
    // Lookalikes that only contain an assistant's name are not AI visits.
    expect(isAiSource("bayou.com")).toBe(false);
    expect(isAiSource("copilot-newsletter")).toBe(false);
    expect(isAiSource("openai.com.example.net")).toBe(false);
  });

  it("gives AI visits their own channel, whatever GA4 filed them under", () => {
    expect(channelOf("Referral", "chatgpt.com")).toBe(AI_CHANNEL);
    expect(channelOf("Organic Search", "google")).toBe("Organic Search");
    expect(channelOf("", "(direct)")).toBe("Unassigned");
  });
});

describe("trafficOverviewRequests", () => {
  it("keeps each batch within GA4's five-report limit", () => {
    const batches = trafficOverviewRequests(window);
    for (const batch of batches) expect(batch.requests.length).toBeLessThanOrEqual(5);
  });
});

describe("parseTrafficOverview", () => {
  const batchA = {
    reports: [
      { rows: [row(["current"], [500, 400, 12]), row(["previous"], [400, 330, 9])] },
      {
        rows: [
          row(["Organic Search", "google", "current"], [200]),
          row(["Organic Search", "bing", "current"], [20]),
          row(["Referral", "chatgpt.com", "current"], [30]),
          row(["Referral", "clutch.co", "current"], [50]),
          row(["Direct", "(direct)", "current"], [200]),
          row(["Organic Search", "google", "previous"], [150]),
          row(["Referral", "chatgpt.com", "previous"], [10]),
          row(["Direct", "(direct)", "previous"], [240]),
        ],
      },
      { rows: [row(["20261102"], [30]), row(["20261101"], [20])] },
      { rows: [row(["20261101"], [12]), row(["20261102"], [18])] },
    ],
  };
  const batchB = {
    reports: [
      {
        rows: [
          row(["/"], [180, 3]),
          row(["/blog/lidar-cost/"], [90, 1]),
          row(["(not set)"], [40, 0]),
        ],
      },
      { rows: [row(["/blog/lidar-cost/"], [80]), row(["/"], [60])] },
    ],
  };

  const data = parseTrafficOverview(batchA, batchB);

  it("reads visits, visitors and form submissions for both periods", () => {
    expect(data.totals.current).toMatchObject({ visits: 500, visitors: 400, forms: 12 });
    expect(data.totals.previous).toMatchObject({ visits: 400, visitors: 330, forms: 9 });
  });

  it("counts search and AI visits from organic search plus AI assistants", () => {
    expect(data.totals.current.searchAndAi).toBe(250);
    expect(data.totals.previous.searchAndAi).toBe(160);
  });

  it("lists current channels with AI split out, most visits first", () => {
    expect(data.channels).toEqual([
      { channel: "Organic Search", visits: 220 },
      { channel: "Direct", visits: 200 },
      { channel: "Referral", visits: 50 },
      { channel: AI_CHANNEL, visits: 30 },
    ]);
  });

  it("joins daily visits with daily search and AI visits, in date order", () => {
    expect(data.daily).toEqual([
      { date: "2026-11-01", visits: 20, searchAndAi: 12 },
      { date: "2026-11-02", visits: 30, searchAndAi: 18 },
    ]);
  });

  it("drops unattributed landing pages and joins search and AI visits", () => {
    expect(data.landingPages).toEqual([
      { path: "/", visits: 180, forms: 3, searchAndAi: 60 },
      { path: "/blog/lidar-cost/", visits: 90, forms: 1, searchAndAi: 80 },
    ]);
  });

  it("survives an empty response", () => {
    expect(parseTrafficOverview(null, null)).toEqual({
      totals: {
        current: { visits: 0, visitors: 0, searchAndAi: 0, forms: 0 },
        previous: { visits: 0, visitors: 0, searchAndAi: 0, forms: 0 },
      },
      channels: [],
      daily: [],
      landingPages: [],
    });
  });
});
