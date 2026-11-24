import { describe, expect, it } from "vitest";
import type { Strategy } from "@/lib/types";
import { goalAchievement, groupStrategies, parseKpi, reviewState, summarizeStrategies } from "./strategy";

function strategy(overrides: Partial<Strategy>): Strategy {
  return {
    id: "s",
    sortOrder: 0,
    priority: "Primary",
    goalType: "Leads",
    initiative: "I",
    action: null,
    startDate: null,
    endDate: null,
    nextReview: null,
    duration: null,
    kpiTarget: null,
    kpiCurrent: null,
    owner: null,
    workProgress: null,
    status: "In Progress",
    workCompleted: null,
    evidenceUrl: null,
    nextSteps: null,
    outcome: null,
    expectedImpact: null,
    timeToImpact: null,
    taskUrl: null,
    updatedAt: "2026-11-23T00:00:00Z",
    ...overrides,
  };
}

describe("parseKpi", () => {
  it("reads counts, money, percentages, ranges and pluses", () => {
    expect(parseKpi("15 leads/month")).toBe(15);
    expect(parseKpi("$30K/month")).toBe(30_000);
    expect(parseKpi("$1.5M")).toBe(1_500_000);
    expect(parseKpi("0.8%")).toBe(0.8);
    expect(parseKpi("AI traffic 40-50/month")).toBe(40);
    expect(parseKpi("AI traffic 40–50/month")).toBe(40);
    expect(parseKpi("250+ URLs Keyword-Mapped")).toBe(250);
    expect(parseKpi("Traffic 3,000/Month")).toBe(3000);
    expect(parseKpi("0")).toBe(0);
  });
  it("returns null without a number", () => {
    expect(parseKpi("")).toBeNull();
    expect(parseKpi(null)).toBeNull();
    expect(parseKpi("pending")).toBeNull();
  });
});

describe("goalAchievement", () => {
  it("compares current with target", () => {
    expect(goalAchievement("15 leads/month", "4 leads/month")).toBe(27);
    expect(goalAchievement("0.8%", "0.4%")).toBe(50);
    expect(goalAchievement("$30K/month", "$10K/month")).toBe(33);
    expect(goalAchievement("AI traffic 40-50/month", "AI traffic 20/month")).toBe(50);
    expect(goalAchievement("10", "12")).toBe(120);
  });
  it("is null when it cannot be measured", () => {
    expect(goalAchievement("15 leads/month", null)).toBeNull();
    expect(goalAchievement(null, "4")).toBeNull();
    expect(goalAchievement("0", "4")).toBeNull();
  });
});

describe("summarizeStrategies", () => {
  it("averages measurable goals (capped at 100) and reported work", () => {
    const summary = summarizeStrategies([
      strategy({ kpiTarget: "10", kpiCurrent: "5", workProgress: 20 }),
      strategy({ kpiTarget: "10", kpiCurrent: "30", workProgress: 40, status: "Planned" }),
      strategy({ kpiTarget: "10" }),
    ]);
    expect(summary).toEqual({
      total: 3,
      inProgress: 2,
      planned: 1,
      completed: 0,
      averageAchievement: 75,
      measured: 2,
      averageWork: 30,
    });
  });
});

describe("groupStrategies", () => {
  it("puts Primary first and keeps sheet order within a goal", () => {
    const groups = groupStrategies([
      strategy({ id: "c", sortOrder: 2, priority: "Secondary", goalType: "Traffic" }),
      strategy({ id: "b", sortOrder: 1, goalType: "Leads" }),
      strategy({ id: "a", sortOrder: 0, goalType: "Leads" }),
    ]);
    expect(groups.map((g) => g.priority)).toEqual(["Primary", "Secondary"]);
    expect(groups[0]!.goals[0]!.items.map((s) => s.id)).toEqual(["a", "b"]);
  });
});

describe("reviewState", () => {
  it("flags a past review date", () => {
    expect(reviewState("2026-06-18", "2026-11-23")).toBe("overdue");
    expect(reviewState("2026-12-01", "2026-11-23")).toBe("due");
    expect(reviewState(null, "2026-11-23")).toBeNull();
  });
});
