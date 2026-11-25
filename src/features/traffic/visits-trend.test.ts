import { describe, expect, it } from "vitest";
import { visitsTrend } from "./visits-trend";

const days = [
  { date: "2026-11-01", visits: 10, searchAndAi: 4 },
  { date: "2026-11-03", visits: 6, searchAndAi: 2 },
  { date: "2026-11-24", visits: 8, searchAndAi: 5 },
];

describe("visitsTrend", () => {
  it("draws a month by day up to the last complete day, with missing days as zero", () => {
    const { unit, columns } = visitsTrend(days, { from: "2026-11-01", to: "2026-11-30" }, "2026-11-24");
    expect(unit).toBe("day");
    expect(columns).toHaveLength(24);
    expect(columns[1]).toMatchObject({ label: "Nov 2", visits: 0, searchAndAi: 0 });
    // A finished day is complete, so nothing is marked "so far".
    expect(columns.some((column) => column.partial)).toBe(false);
  });

  it("marks a month still under way as partial", () => {
    const { unit, columns } = visitsTrend(days, { from: "2026-01-01", to: "2026-11-25" }, "2026-11-24");
    expect(unit).toBe("month");
    expect(columns.at(-1)).toMatchObject({ label: "Nov", visits: 24, searchAndAi: 11, partial: true });
  });

  it("leaves a column that ends on the last complete day whole", () => {
    const { columns } = visitsTrend(days, { from: "2026-10-01", to: "2026-11-24" }, "2026-11-24");
    expect(columns.at(-1)?.partial).toBe(false);
  });
});
