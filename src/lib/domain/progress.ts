import { isWithin, type DateRange } from "@/lib/date-range";
import type {
  CategoryCount,
  MonthKey,
  Progress,
  RoadmapItem,
  RoadmapItemWithProgress,
  Task,
  TaskCounts,
} from "@/lib/types";

/**
 * Whether a task belongs to a reporting period: a completed task by the day it
 * was completed, an open task by its due date. A completed task with no
 * completion date never counts.
 */
export function taskInPeriod(task: Task, range: DateRange): boolean {
  return isWithin(task.status === "completed" ? task.completedDate : task.dueDate, range);
}

export function toProgress(completed: number, total: number): Progress {
  return {
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

export function countTasks(tasks: readonly Task[]): TaskCounts {
  const counts: TaskCounts = { total: tasks.length, todo: 0, inProgress: 0, completed: 0 };
  for (const task of tasks) {
    if (task.status === "todo") counts.todo += 1;
    else if (task.status === "in-progress") counts.inProgress += 1;
    else counts.completed += 1;
  }
  return counts;
}

/**
 * Counts by category, derived from the tasks themselves rather than a fixed
 * list, so it works for any category set, including Teamwork's task lists.
 * Ordered by total descending, then name, so the ranking reads cleanly.
 */
export function countTasksByCategory(tasks: readonly Task[]): CategoryCount[] {
  const byCategory = new Map<string, CategoryCount>();
  for (const task of tasks) {
    const row = byCategory.get(task.category) ?? { category: task.category, total: 0, completed: 0 };
    row.total += 1;
    if (task.status === "completed") row.completed += 1;
    byCategory.set(task.category, row);
  }
  return [...byCategory.values()].sort(
    (a, b) => b.total - a.total || a.category.localeCompare(b.category),
  );
}

/**
 * Derives an item's progress from its linked tasks, so the roadmap can never
 * disagree with the work tracker. An item with no tasks yet is pending at 0%.
 */
export function resolveRoadmapItem(
  item: RoadmapItem,
  tasksById: ReadonlyMap<string, Task>,
): RoadmapItemWithProgress {
  const linked = item.taskIds.flatMap((id) => {
    const task = tasksById.get(id);
    return task ? [task] : [];
  });
  const completed = linked.filter((task) => task.status === "completed").length;
  const progress = toProgress(completed, linked.length);
  return {
    ...item,
    progress,
    status: linked.length > 0 && completed === linked.length ? "completed" : "pending",
  };
}

export function resolveRoadmap(
  items: readonly RoadmapItem[],
  tasks: readonly Task[],
): RoadmapItemWithProgress[] {
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  return items.map((item) => resolveRoadmapItem(item, tasksById));
}

/** Share of roadmap items fully completed, optionally within one month. */
export function computeRoadmapProgress(
  items: readonly RoadmapItemWithProgress[],
  month?: MonthKey,
): Progress {
  const scoped = month ? items.filter((item) => item.month === month) : items;
  return toProgress(
    scoped.filter((item) => item.status === "completed").length,
    scoped.length,
  );
}
