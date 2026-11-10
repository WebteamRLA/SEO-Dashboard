import { describe, expect, it } from "vitest";
import { completeMonths, isMonthKey, toMonthKey } from "./month";

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


describe("toMonthKey", () => {
  it("takes the month from dates and timestamps", () => {
    expect(toMonthKey("2026-10-05")).toBe("2026-10");
    expect(toMonthKey("2026-10-05T09:00:00Z")).toBe("2026-10");
    // 23:30 on Sep 30 in New York is already October in UTC.
    expect(toMonthKey("2026-10-01T03:30:00.000Z")).toBe("2026-09");
  });
});

describe("completeMonths", () => {
  it("removes only the month in progress", () => {
    const rows = [{ month: "2026-10" }, { month: "2026-11" }];
    expect(completeMonths(rows, "2026-11")).toEqual([{ month: "2026-10" }]);
  });
});
