import { describe, expect, it } from "vitest";
import {
  formatRange,
  isWithin,
  monthsInRange,
  periodLabel,
  describePeriod,
  formatMonthSpan,
  periodParams,
  presetRange,
  previousRange,
  rangeDays,
  resolvePeriod,
} from "./date-range";

const TODAY = "2026-11-10";

describe("presetRange", () => {
  it("covers each preset relative to today", () => {
    expect(presetRange("this-month", TODAY)).toEqual({ from: "2026-11-01", to: "2026-11-10" });
    expect(presetRange("last-month", TODAY)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(presetRange("last-7-days", TODAY)).toEqual({ from: "2026-11-04", to: "2026-11-10" });
    expect(presetRange("last-30-days", TODAY)).toEqual({ from: "2026-10-12", to: "2026-11-10" });
    expect(presetRange("last-90-days", TODAY)).toEqual({ from: "2026-08-13", to: "2026-11-10" });
    expect(presetRange("this-quarter", TODAY)).toEqual({ from: "2026-10-01", to: "2026-11-10" });
    expect(presetRange("year-to-date", TODAY)).toEqual({ from: "2026-01-01", to: "2026-11-10" });
  });

  it("handles year boundaries and leap years", () => {
    expect(presetRange("last-month", "2026-01-15")).toEqual({ from: "2025-12-01", to: "2025-12-31" });
    expect(presetRange("last-month", "2028-03-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    expect(presetRange("this-quarter", "2026-03-31")).toEqual({ from: "2026-01-01", to: "2026-03-31" });
  });
});

describe("resolvePeriod", () => {
  it("uses a valid preset", () => {
    expect(resolvePeriod({ range: "last-month" }, TODAY)).toEqual({
      preset: "last-month",
      range: { from: "2026-10-01", to: "2026-10-31" },
    });
  });

  it("accepts a valid custom range", () => {
    expect(resolvePeriod({ from: "2026-10-03", to: "2026-11-10" }, TODAY)).toEqual({
      preset: "custom",
      range: { from: "2026-10-03", to: "2026-11-10" },
    });
  });

  it("reads the older ?month= links as that whole month", () => {
    expect(resolvePeriod({ month: "2026-02" }, TODAY).range).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  });

  it("falls back to this month for anything invalid", () => {
    const fallback = { preset: "this-month", range: { from: "2026-11-01", to: "2026-11-10" } };
    for (const params of [
      {},
      { range: "forever" },
      { from: "2026-02-31", to: "2026-03-05" },
      { from: "2026-11-10", to: "2026-11-01" },
      { from: "2000-01-01", to: "2026-11-10" },
      { from: "<script>", to: "2026-11-10" },
      { month: "2026-13" },
    ]) {
      expect(resolvePeriod(params, TODAY)).toEqual(fallback);
    }
  });

  it("uses the first value of a repeated parameter", () => {
    expect(resolvePeriod({ range: ["last-7-days", "year-to-date"] }, TODAY).preset).toBe("last-7-days");
  });
});

describe("periodParams", () => {
  it("stores a preset by name and a custom range by its dates", () => {
    expect(periodParams(resolvePeriod({ range: "this-month" }, TODAY))).toEqual({ range: "this-month" });
    expect(periodParams(resolvePeriod({ from: "2026-10-03", to: "2026-10-09" }, TODAY))).toEqual({
      from: "2026-10-03",
      to: "2026-10-09",
    });
  });
});

describe("range helpers", () => {
  const range = { from: "2026-10-03", to: "2026-11-10" };

  it("tests dates and timestamps inclusively", () => {
    expect(isWithin("2026-10-03", range)).toBe(true);
    expect(isWithin("2026-11-10T23:59:00Z", range)).toBe(true);
    expect(isWithin("2026-11-11", range)).toBe(false);
    expect(isWithin(null, range)).toBe(false);
  });

  it("lists the months a range touches", () => {
    expect(monthsInRange(range)).toEqual(["2026-10", "2026-11"]);
    expect(monthsInRange({ from: "2025-12-20", to: "2026-01-05" })).toEqual(["2025-12", "2026-01"]);
    expect(monthsInRange({ from: "2026-11-01", to: "2026-11-10" })).toEqual(["2026-11"]);
  });

  it("measures length and finds the equal period before", () => {
    expect(rangeDays({ from: "2026-11-01", to: "2026-11-10" })).toBe(10);
    expect(previousRange({ from: "2026-11-01", to: "2026-11-10" })).toEqual({ from: "2026-10-22", to: "2026-10-31" });
  });
});

describe("formatting", () => {
  it("formats ranges compactly", () => {
    expect(formatRange({ from: "2026-11-01", to: "2026-11-10" })).toBe("Nov 1 – 10, 2026");
    expect(formatRange({ from: "2026-10-03", to: "2026-11-10" })).toBe("Oct 3 – Nov 10, 2026");
    expect(formatRange({ from: "2025-12-20", to: "2026-01-05" })).toBe("Dec 20, 2025 – Jan 5, 2026");
    expect(formatRange({ from: "2026-11-10", to: "2026-11-10" })).toBe("Nov 10, 2026");
  });

  it("names presets and formats custom periods", () => {
    expect(periodLabel(resolvePeriod({ range: "last-30-days" }, TODAY))).toBe("Last 30 days");
    expect(periodLabel(resolvePeriod({ from: "2026-10-03", to: "2026-11-10" }, TODAY))).toBe("Oct 3 – Nov 10, 2026");
  });

  it("describes a period for subtitles", () => {
    expect(describePeriod(resolvePeriod({ range: "this-month" }, TODAY))).toBe("This month · Nov 1 – 10, 2026");
    expect(describePeriod(resolvePeriod({ from: "2026-10-03", to: "2026-10-09" }, TODAY))).toBe("Oct 3 – 9, 2026");
  });

  it("formats a span of months", () => {
    expect(formatMonthSpan(["2026-11"])).toBe("Nov 2026");
    expect(formatMonthSpan(["2026-10", "2026-11"])).toBe("Oct – Nov 2026");
    expect(formatMonthSpan(["2025-12", "2026-01"])).toBe("Dec 2025 – Jan 2026");
    expect(formatMonthSpan([])).toBe("");
  });
});
