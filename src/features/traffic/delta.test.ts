import { describe, expect, it } from "vitest";
import { tileChange } from "./delta";

describe("tileChange", () => {
  it("shows a percentage against a non-zero previous period", () => {
    expect(tileChange("percent", 15, 10)).toEqual({ delta: { text: "50.0%", direction: "up" }, detail: "vs. previous period" });
  });

  it("says there were none before instead of leaving the tile blank", () => {
    expect(tileChange("percent", 3, 0)).toEqual({ detail: "None in the previous period" });
    expect(tileChange("percent", 0, 0)).toEqual({ delta: { text: "No change", direction: "flat" }, detail: "vs. previous period" });
  });
});
