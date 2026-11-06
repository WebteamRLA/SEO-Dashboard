import { describe, expect, it } from "vitest";
import { completeMonths, isMonthKey, pickMonth, toMonthKey } from "./month";

const available = ["2026-09", "2026-10"];

describe("isMonthKey", () => {
  it("accepts only YYYY-MM with a real month", () => {
    expect(isMonthKey("2026-10")).toBe(true);
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey("2026-00")).toBe(false);
    expect(isMonthKey("2026-1")).toBe(false);
    expect(isMonthKey(undefined)).toBe(false);
  });
});

describe("pickMonth", () => {
  it("returns a known month", () => {
    expect(pickMonth("2026-09", available, "2026-10")).toBe("2026-09");
  });

  it("uses the first value of a repeated parameter", () => {
    expect(pickMonth(["2026-09", "2026-10"], available, "2026-10")).toBe("2026-09");
  });

  it("falls back for missing, malformed, or unavailable months", () => {
    expect(pickMonth(undefined, available, "2026-10")).toBe("2026-10");
    expect(pickMonth("<script>", available, "2026-10")).toBe("2026-10");
    expect(pickMonth("2020-01", available, "2026-10")).toBe("2026-10");
  });
});

describe("toMonthKey", () => {
  it("takes the month from dates and timestamps", () => {
    expect(toMonthKey("2026-10-05")).toBe("2026-10");
    expect(toMonthKey("2026-10-05T09:00:00Z")).toBe("2026-10");
  });
});

describe("completeMonths", () => {
  it("removes only the month in progress", () => {
    const rows = [{ month: "2026-10" }, { month: "2026-11" }];
    expect(completeMonths(rows, "2026-11")).toEqual([{ month: "2026-10" }]);
  });
});
