import { describe, expect, it } from "vitest";
import type { RoadmapItem, Task } from "@/lib/types";
import {
  computeRoadmapProgress,
  countTasks,
  countTasksByCategory,
  resolveRoadmap,
  taskInPeriod,
  toProgress,
} from "./progress";

function task(id: string, status: Task["status"], overrides: Partial<Task> = {}): Task {
  return {
    id,
    name: id,
    category: "Technical SEO",
    project: "RLA Website",
    assigneeId: "maya",
    status,
    month: "2026-10",
    dueDate: "2026-10-20",
    completedDate: status === "completed" ? "2026-10-18" : null,
    ...overrides,
  };
}

function item(id: string, taskIds: string[], month = "2026-10"): RoadmapItem {
  return { id, title: id, category: "Technical SEO", month, taskIds };
}

describe("toProgress", () => {
  it("rounds to a whole percent", () => {
    expect(toProgress(1, 3)).toEqual({ completed: 1, total: 3, percent: 33 });
  });

  it("returns 0 rather than NaN when there is nothing to complete", () => {
    expect(toProgress(0, 0).percent).toBe(0);
  });
});

describe("countTasks", () => {
  it("counts each status and the total", () => {
    const counts = countTasks([task("a", "todo"), task("b", "in-progress"), task("c", "completed")]);
    expect(counts).toEqual({ total: 3, todo: 1, inProgress: 1, completed: 1 });
  });
});

describe("countTasksByCategory", () => {
  it("counts only the categories present, ranked by total then name", () => {
    const rows = countTasksByCategory([
      task("a", "completed", { category: "Technical SEO" }),
      task("b", "todo", { category: "Technical SEO" }),
      task("c", "completed", { category: "Blog Writing" }),
    ]);
    expect(rows).toEqual([
      { category: "Technical SEO", total: 2, completed: 1 },
      { category: "Blog Writing", total: 1, completed: 1 },
    ]);
  });

  it("returns nothing for no tasks", () => {
    expect(countTasksByCategory([])).toEqual([]);
  });
});

describe("resolveRoadmap", () => {
  it("completes an item only when every linked task is completed", () => {
    const tasks = [task("a", "completed"), task("b", "in-progress")];
    const [partial, done] = resolveRoadmap([item("x", ["a", "b"]), item("y", ["a"])], tasks);
    expect(partial).toMatchObject({ status: "pending", progress: { percent: 50 } });
    expect(done).toMatchObject({ status: "completed", progress: { percent: 100 } });
  });

  it("treats an item with no tasks as pending, not complete", () => {
    const [empty] = resolveRoadmap([item("x", [])], []);
    expect(empty).toMatchObject({ status: "pending", progress: { percent: 0 } });
  });

  it("ignores task ids that no longer exist", () => {
    const [resolved] = resolveRoadmap([item("x", ["a", "gone"])], [task("a", "completed")]);
    expect(resolved).toMatchObject({ status: "completed", progress: { total: 1 } });
  });
});

describe("computeRoadmapProgress", () => {
  const tasks = [task("a", "completed"), task("b", "todo")];
  const items = resolveRoadmap(
    [item("oct-done", ["a"]), item("oct-open", ["b"]), item("nov-open", [], "2026-11")],
    tasks,
  );

  it("measures the whole year when no month is given", () => {
    expect(computeRoadmapProgress(items)).toMatchObject({ completed: 1, total: 3, percent: 33 });
  });

  it("scopes to a single month", () => {
    expect(computeRoadmapProgress(items, "2026-10")).toMatchObject({ completed: 1, total: 2 });
    expect(computeRoadmapProgress(items, "2026-11")).toMatchObject({ completed: 0, total: 1 });
  });
});

describe("taskInPeriod", () => {
  const range = { from: "2026-11-01", to: "2026-11-10" };

  it("counts a completed task by its completion date", () => {
    expect(taskInPeriod(task("a", "completed", { completedDate: "2026-11-10", dueDate: "2026-10-01" }), range)).toBe(true);
    expect(taskInPeriod(task("b", "completed", { completedDate: "2026-10-31", dueDate: "2026-11-05" }), range)).toBe(false);
  });

  it("counts an open task by its due date", () => {
    expect(taskInPeriod(task("c", "todo", { dueDate: "2026-11-01" }), range)).toBe(true);
    expect(taskInPeriod(task("d", "in-progress", { dueDate: "2026-11-11" }), range)).toBe(false);
  });

  it("never counts a completed task without a completion date", () => {
    expect(taskInPeriod(task("e", "completed", { completedDate: null, dueDate: "2026-11-05" }), range)).toBe(false);
  });
});
