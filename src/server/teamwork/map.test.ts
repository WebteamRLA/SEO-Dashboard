import { describe, expect, it } from "vitest";
import { filterByTag, findTagId, mapTeamworkTasks, toTaskStatus } from "./map";
import type { TeamworkTask } from "./types";

function raw(overrides: Partial<TeamworkTask> = {}): TeamworkTask {
  return {
    id: 1,
    name: "Task",
    status: "new",
    progress: 0,
    dueDate: "2026-11-11",
    startDate: "2026-11-06",
    completedOn: null,
    createdAt: "2026-11-06T03:25:30Z",
    tasklistId: 2873389,
    tagIds: [156895],
    assigneeUserIds: [152346],
    ...overrides,
  };
}

const included = {
  users: { "152346": { id: 152346, firstName: "Courtney", lastName: "Wasserburger" } },
  tasklists: { "2873389": { id: 2873389, name: "General tasks" } },
  tags: { "156895": { id: 156895, name: "SEOTeam" }, "155508": { id: 155508, name: "WebTeam" } },
};

describe("toTaskStatus", () => {
  it("maps completed, reopened, in-progress by percent, and new", () => {
    expect(toTaskStatus("completed", 100)).toBe("completed");
    expect(toTaskStatus("reopened", 0)).toBe("in-progress");
    expect(toTaskStatus("new", 40)).toBe("in-progress");
    expect(toTaskStatus("new", 0)).toBe("todo");
  });
});

describe("mapTeamworkTasks", () => {
  it("maps fields, prefixes the id, and uses the task list as the category", () => {
    const { tasks, people } = mapTeamworkTasks([raw()], included, "SEO - RLA");
    expect(tasks[0]).toEqual({
      id: "tw-1",
      name: "Task",
      category: "General tasks",
      project: "SEO - RLA",
      assigneeId: "152346",
      status: "todo",
      month: "2026-11",
      dueDate: "2026-11-11",
      completedDate: null,
      completedAt: null,
    });
    expect(people).toEqual({ "152346": "Courtney Wasserburger" });
  });

  it("files a completed task under its completion month, not its due month", () => {
    const [task] = mapTeamworkTasks(
      [raw({ status: "completed", completedOn: "2026-10-02", dueDate: "2026-11-11" })],
      included,
      "SEO - RLA",
    ).tasks;
    expect(task).toMatchObject({ month: "2026-10", status: "completed", completedDate: "2026-10-02" });
  });

  it("does not invent an assignee or a due date", () => {
    const [task] = mapTeamworkTasks(
      [raw({ assigneeUserIds: [], dueDate: null, completedOn: null })],
      included,
      "SEO - RLA",
    ).tasks;
    expect(task).toMatchObject({ assigneeId: "", dueDate: "", month: "2026-11" });
  });

  it("falls back to Unsorted when the task list is missing", () => {
    const [task] = mapTeamworkTasks([raw({ tasklistId: 999 })], included, "SEO - RLA").tasks;
    expect(task?.category).toBe("Unsorted");
  });
});

describe("findTagId / filterByTag", () => {
  it("resolves a tag id by name and keeps only tagged tasks", () => {
    const seoId = findTagId(included, "SEOTeam");
    expect(seoId).toBe(156895);
    const tasks = [raw({ id: 1, tagIds: [156895] }), raw({ id: 2, tagIds: [155508] })];
    expect(filterByTag(tasks, seoId!).map((t) => t.id)).toEqual([1]);
  });

  it("returns null for an unknown tag", () => {
    expect(findTagId(included, "Nope")).toBeNull();
  });
});
