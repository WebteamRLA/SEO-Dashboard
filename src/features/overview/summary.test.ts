import { describe, expect, it } from "vitest";
import { buildMonthSummary } from "./summary";

const base = {
  monthLabel: "October 2026",
  tasks: { total: 10, todo: 2, inProgress: 3, completed: 5 },
  monthlyPlan: { completed: 1, total: 4, percent: 25 },
  leads: { total: 12, spam: 2, genuine: 10, organic: 5, won: 1, wonRevenue: 5000 },
  sources: [{ source: "Organic Search" as const, count: 5 }],
};

describe("buildMonthSummary", () => {
  it("derives statements from the figures", () => {
    const lines = buildMonthSummary(base);
    expect(lines[0]).toContain("5 of 10 tasks");
    expect(lines.join(" ")).toContain("50%");
    expect(lines.at(-1)).toContain("1 won deal worth $5,000");
  });

  it("handles an empty month", () => {
    const lines = buildMonthSummary({
      ...base,
      tasks: { total: 0, todo: 0, inProgress: 0, completed: 0 },
      monthlyPlan: { completed: 0, total: 0, percent: 0 },
      leads: { total: 0, spam: 0, genuine: 0, organic: 0, won: 0, wonRevenue: 0 },
      sources: [],
    });
    expect(lines).toEqual([
      "No SEO tasks are scheduled for October 2026.",
      "No leads were received this month.",
      "No won deals from leads submitted this month.",
    ]);
  });

  it("does not name one source as largest when sources are tied", () => {
    const lines = buildMonthSummary({
      ...base,
      sources: [
        { source: "Organic Search", count: 4 },
        { source: "Referral", count: 4 },
        { source: "Direct", count: 1 },
      ],
    });
    expect(lines.join(" ")).toContain("Organic Search and Referral are tied as the largest sources with 4 leads each.");
  });

  it("lists three tied sources", () => {
    const lines = buildMonthSummary({
      ...base,
      sources: [
        { source: "Organic Search", count: 1 },
        { source: "Referral", count: 1 },
        { source: "Direct", count: 1 },
      ],
    });
    expect(lines.join(" ")).toContain("Organic Search, Referral, and Direct are tied as the largest sources with 1 lead each.");
  });

  it("uses singular wording for a count of one", () => {
    const lines = buildMonthSummary({
      ...base,
      leads: { total: 1, spam: 0, genuine: 1, organic: 1, won: 0, wonRevenue: 0 },
      sources: [{ source: "Direct", count: 1 }],
    });
    const text = lines.join(" ");
    expect(text).toContain("1 genuine lead,");
    expect(text).toContain("Direct is the largest source with 1 lead.");
  });

  it("uses singular wording for one spam submission", () => {
    const lines = buildMonthSummary({
      ...base,
      leads: { total: 1, spam: 1, genuine: 0, organic: 0, won: 0, wonRevenue: 0 },
      sources: [],
    });
    expect(lines.join(" ")).toContain("1 submission marked as spam.");
  });
});
