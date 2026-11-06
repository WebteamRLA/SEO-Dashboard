import { describe, expect, it } from "vitest";
import { niceTicks } from "./ticks";

describe("niceTicks", () => {
  it("produces round values that reach the maximum", () => {
    expect(niceTicks(3385)).toEqual([0, 1000, 2000, 3000, 4000]);
    expect(niceTicks(101200)).toEqual([0, 25000, 50000, 75000, 100000, 125000]);
  });

  it("handles small decimal values without float noise", () => {
    expect(niceTicks(3.4)).toEqual([0, 1, 2, 3, 4]);
    expect(niceTicks(0.3)).toEqual([0, 0.1, 0.2, 0.3]);
  });

  it("never gives whole-number data fractional ticks", () => {
    expect(niceTicks(2)).toEqual([0, 1, 2]);
  });

  it("returns a usable axis when there is no data", () => {
    expect(niceTicks(0)).toEqual([0, 1]);
    expect(niceTicks(Number.NaN)).toEqual([0, 1]);
  });

  it("includes an exact multiple once", () => {
    expect(niceTicks(100)).toEqual([0, 20, 40, 60, 80, 100]);
  });
});
