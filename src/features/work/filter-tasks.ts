import type { Task, TaskStatus } from "@/lib/types";

export interface TaskRow extends Task {
  assigneeName: string;
}

export interface TaskFilters {
  query: string;
  status: string;
  category: string;
}

export const STATUS_META: Record<TaskStatus, { label: string; tone: "neutral" | "warning" | "good" }> = {
  todo: { label: "To do", tone: "neutral" },
  "in-progress": { label: "In progress", tone: "warning" },
  completed: { label: "Completed", tone: "good" },
};

/** `all` means no restriction. Search matches name, project, and assignee. */
export function filterTasks(rows: readonly TaskRow[], filters: TaskFilters): TaskRow[] {
  const query = filters.query.trim().toLowerCase();
  return rows.filter((row) => {
    if (filters.status !== "all" && row.status !== filters.status) return false;
    if (filters.category !== "all" && row.category !== filters.category) return false;
    if (!query) return true;
    return [row.name, row.project, row.assigneeName].some((value) => value.toLowerCase().includes(query));
  });
}
