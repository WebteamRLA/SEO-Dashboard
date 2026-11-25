import { describe, expect, it } from "vitest";
import { bucketUnit, periodBuckets } from "./period-buckets";

describe("bucketUnit", () => {
  it("draws a month by day, a quarter by week and a year by month", () => {
    expect(bucketUnit(7)).toBe("day");
    expect(bucketUnit(31)).toBe("day");
    expect(bucketUnit(90)).toBe("week");
    expect(bucketUnit(92)).toBe("week");
    expect(bucketUnit(329)).toBe("month");
  });
});

describe("periodBuckets", () => {
  const november = { from: "2026-11-01", to: "2026-11-30" };

  it("covers the whole period by default", () => {
    const { unit, buckets } = periodBuckets(november, "2026-11-25");
    expect(unit).toBe("day");
    expect(buckets).toHaveLength(30);
    expect(buckets[0]).toMatchObject({ label: "Nov 1", range: { from: "2026-11-01", to: "2026-11-01" } });
    expect(buckets.filter((b) => b.partial).map((b) => b.label)).toEqual(["Nov 25"]);
  });

  it("stops at today when asked", () => {
    const { buckets } = periodBuckets(november, "2026-11-25", { stopAtToday: true });
    expect(buckets).toHaveLength(25);
    expect(buckets.at(-1)?.range.to).toBe("2026-11-25");
  });

  it("runs weeks from the first day and clips the last one", () => {
    const { unit, buckets } = periodBuckets({ from: "2026-10-01", to: "2026-12-31" }, "2026-11-25");
    expect(unit).toBe("week");
    expect(buckets[0]).toMatchObject({ label: "Oct 1–7" });
    expect(buckets[4]).toMatchObject({ label: "Oct 29–Nov 4" });
    // 92 days is 13 weeks and one day: the day joins the last week instead of standing alone.
    expect(buckets).toHaveLength(13);
    expect(buckets.at(-1)).toMatchObject({ label: "Dec 24–31", range: { from: "2026-12-24", to: "2026-12-31" } });
    expect(buckets.filter((b) => b.partial).map((b) => b.label)).toEqual(["Nov 19–25"]);
  });

  it("marks the week holding today as partial when it ends later", () => {
    const { buckets } = periodBuckets({ from: "2026-10-01", to: "2026-12-31" }, "2026-11-24", { stopAtToday: true });
    const last = buckets.at(-1);
    expect(last).toMatchObject({ partial: true, range: { from: "2026-11-19", to: "2026-11-24" } });
  });

  it("uses calendar months for long periods, with the year when they span two", () => {
    const ytd = periodBuckets({ from: "2026-01-01", to: "2026-11-25" }, "2026-11-25").buckets;
    expect(ytd.map((b) => b.label)).toEqual(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"]);
    expect(ytd.at(-1)?.range).toEqual({ from: "2026-11-01", to: "2026-11-25" });
    const span = periodBuckets({ from: "2025-11-15", to: "2026-03-10" }, "2026-11-25").buckets;
    expect(span[0]).toMatchObject({ label: "Nov ’25", range: { from: "2025-11-15", to: "2025-11-30" } });
    expect(span.at(-1)).toMatchObject({ label: "Mar ’26", range: { from: "2026-03-01", to: "2026-03-10" } });
  });

  it("keeps a 90-day tail of six days as its own week", () => {
    const { buckets } = periodBuckets({ from: "2026-08-28", to: "2026-11-25" }, "2026-11-25");
    expect(buckets).toHaveLength(13);
    expect(buckets.at(-1)?.range).toEqual({ from: "2026-11-20", to: "2026-11-25" });
  });

  it("labels months with the year whenever the period spans two, even when it stops at today", () => {
    const { buckets } = periodBuckets({ from: "2026-06-01", to: "2027-05-31" }, "2026-11-25", { stopAtToday: true });
    expect(buckets.map((b) => b.label)).toEqual(["Jun ’26", "Jul ’26", "Aug ’26", "Sep ’26", "Oct ’26", "Nov ’26"]);
  });
});
