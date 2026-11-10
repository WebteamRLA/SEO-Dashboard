import { describe, expect, it } from "vitest";
import type { Task, TaskStatus } from "@/lib/types";
import { filterByStatus, groupByCategory, groupByMonth, monthsOfYear } from "./group";

const task = (id: string, month: string, category: string, status: TaskStatus): Task => ({
  id,
  name: id,
  category,
  project: "SEO",
  assigneeId: "u1",
  status,
  month,
  dueDate: `${month}-15`,
  completedDate: status === "completed" ? `${month}-10` : null,
});

const tasks = [
  task("a", "2026-01", "General tasks", "completed"),
  task("b", "2026-01", "Cards", "in-progress"),
  task("c", "2026-02", "General tasks", "todo"),
];

describe("roadmap grouping", () => {
  it("treats to do and in progress as pending", () => {
    expect(filterByStatus(tasks, "pending").map((t) => t.id)).toEqual(["b", "c"]);
    expect(filterByStatus(tasks, "completed").map((t) => t.id)).toEqual(["a"]);
    expect(filterByStatus(tasks, "all")).toHaveLength(3);
  });
  it("groups by the tasks' own categories, alphabetically", () => {
    expect(groupByCategory(tasks).map((g) => [g.category, g.tasks.length])).toEqual([
      ["Cards", 1],
      ["General tasks", 2],
    ]);
  });
  it("keeps empty months", () => {
    const groups = groupByMonth(tasks, ["2026-01", "2026-02", "2026-03"]);
    expect(groups.map((g) => g.tasks.length)).toEqual([2, 1, 0]);
  });
  it("lists the months of a year", () => {
    const months = monthsOfYear("2026");
    expect(months).toHaveLength(12);
    expect([months[0], months[11]]).toEqual(["2026-01", "2026-12"]);
  });
});
