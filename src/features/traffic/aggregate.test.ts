import { describe, expect, it } from "vitest";
import { previousRange } from "@/lib/date-range";
import { monthsInRange } from "@/lib/date-range";
import { aggregateSearch, aggregateTraffic } from "./aggregate";

const search = [
  { month: "2026-09", clicks: 100, impressions: 1000, ctr: 10, position: 10 },
  { month: "2026-10", clicks: 50, impressions: 3000, ctr: 1.7, position: 20 },
  { month: "2026-11", clicks: 10, impressions: 100, ctr: 10, position: 5 },
];
const traffic = [
  { month: "2026-09", sessions: 10, users: 8, organicSessions: 5, organicVisitors: 4, referralSessions: 1 },
  { month: "2026-10", sessions: 20, users: 15, organicSessions: 9, organicVisitors: 7, referralSessions: 2 },
];

describe("aggregateSearch", () => {
  it("sums, computes CTR from totals and weights position by impressions", () => {
    const totals = aggregateSearch(search, ["2026-09", "2026-10"]);
    expect(totals?.clicks).toBe(150);
    expect(totals?.impressions).toBe(4000);
    expect(totals?.ctr).toBe(3.8);
    expect(totals?.position).toBeCloseTo(17.5, 5);
  });
  it("returns undefined for an empty set", () => {
    expect(aggregateSearch(search, ["2020-01"])).toBeUndefined();
    expect(aggregateSearch(search, [])).toBeUndefined();
  });
  it("builds the previous-period input from the previous range", () => {
    const range = { from: "2026-10-01", to: "2026-10-31" };
    const prior = aggregateSearch(search, monthsInRange(previousRange(range)));
    expect(prior?.clicks).toBe(100);
  });
});

describe("aggregateTraffic", () => {
  it("sums every field", () => {
    expect(aggregateTraffic(traffic, ["2026-09", "2026-10"])).toEqual({
      sessions: 30,
      users: 23,
      organicSessions: 14,
      organicVisitors: 11,
      referralSessions: 3,
    });
  });
  it("returns undefined for an empty set", () => expect(aggregateTraffic(traffic, ["2030-01"])).toBeUndefined());
});

