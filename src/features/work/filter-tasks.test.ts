import { describe, expect, it } from "vitest";
import { filterTasks, type TaskRow } from "./filter-tasks";

const row = (over: Partial<TaskRow>): TaskRow => ({
  id: "t",
  name: "Audit",
  category: "Technical SEO",
  project: "Acme",
  assigneeId: "u1",
  assigneeName: "Maya Okafor",
  status: "todo",
  month: "2026-10",
  dueDate: "2026-10-10",
  completedDate: null,
  ...over,
});

const rows = [
  row({ id: "1" }),
  row({ id: "2", status: "completed", category: "Blog Writing", name: "Post" }),
];

describe("filterTasks", () => {
  it("filters by status and category", () => {
    expect(filterTasks(rows, { query: "", status: "completed", category: "all" }).map((r) => r.id)).toEqual(["2"]);
    expect(filterTasks(rows, { query: "", status: "all", category: "Technical SEO" }).map((r) => r.id)).toEqual(["1"]);
  });
  it("searches name, project and assignee case-insensitively", () => {
    expect(filterTasks(rows, { query: " maya", status: "all", category: "all" })).toHaveLength(2);
    expect(filterTasks(rows, { query: "post", status: "all", category: "all" })).toHaveLength(1);
    expect(filterTasks(rows, { query: "zzz", status: "all", category: "all" })).toHaveLength(0);
  });
});
