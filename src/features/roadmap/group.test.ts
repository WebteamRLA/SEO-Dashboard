import { describe, expect, it } from "vitest";
import type { RoadmapItemWithProgress } from "@/lib/types";
import { describeItemProgress, filterByStatus, groupByCategory, groupByMonth } from "./group";

const item = (id: string, month: string, category: RoadmapItemWithProgress["category"], status: "completed" | "pending") =>
  ({ id, title: id, month, category, taskIds: [], status, progress: { completed: 0, total: 0, percent: 0 } }) as RoadmapItemWithProgress;

const items = [
  item("a", "2026-01", "On-Page", "completed"),
  item("b", "2026-01", "Blog Writing", "pending"),
  item("c", "2026-02", "Blog Writing", "pending"),
];

describe("roadmap grouping", () => {
  it("filters by status", () => {
    expect(filterByStatus(items, "pending")).toHaveLength(2);
    expect(filterByStatus(items, "all")).toHaveLength(3);
  });
  it("groups by category in fixed order", () => {
    expect(groupByCategory(items).map((g) => g.category)).toEqual(["Blog Writing", "On-Page"]);
  });
  it("keeps empty months", () => {
    const groups = groupByMonth(items, ["2026-01", "2026-02", "2026-03"]);
    expect(groups.map((g) => g.items.length)).toEqual([2, 1, 0]);
  });
  it("describes progress", () => {
    expect(describeItemProgress({ completed: 0, total: 0, percent: 0 })).toBe("Not started");
    expect(describeItemProgress({ completed: 2, total: 3, percent: 67 })).toBe("2 of 3 tasks");
    expect(describeItemProgress({ completed: 1, total: 1, percent: 100 })).toBe("1 of 1 task");
  });
});
