import { describe, expect, it } from "vitest";
import { describeChange, findPrior } from "./trend";

describe("findPrior", () => {
  const rows = [{ month: "2026-01" }, { month: "2026-02" }];
  it("returns the preceding row", () => expect(findPrior(rows, "2026-02")?.month).toBe("2026-01"));
  it("returns undefined for the first or an unknown month", () => {
    expect(findPrior(rows, "2026-01")).toBeUndefined();
    expect(findPrior(rows, "2030-01")).toBeUndefined();
  });
});

describe("describeChange", () => {
  it("words position as improved when the number falls", () => {
    expect(describeChange("position", 12.6, 13.2, "September")).toBe("Improved by 0.6 vs September");
    expect(describeChange("position", 13.2, 12.6, "September")).toBe("Worsened by 0.6 vs September");
  });
  it("reports percent change", () => {
    expect(describeChange("percent", 110, 100, "Sep")).toBe("Up 10.0% vs Sep");
    expect(describeChange("percent", 90, 100, "Sep")).toBe("Down 10.0% vs Sep");
    expect(describeChange("percent", 100, 100, "Sep")).toBe("No change vs Sep");
  });
  it("reports CTR change in points", () => {
    expect(describeChange("points", 3.3, 3.1, "Sep")).toBe("Up 0.2 points vs Sep");
  });
  it("has nothing to say without a usable prior", () => {
    expect(describeChange("percent", 5, undefined, "Sep")).toBeUndefined();
    expect(describeChange("percent", 5, 0, "Sep")).toBeUndefined();
  });
});
