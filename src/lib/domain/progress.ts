import type {
  CategoryCount,
  MonthKey,
  Progress,
  RoadmapItem,
  RoadmapItemWithProgress,
  Task,
  TaskCounts,
} from "@/lib/types";
import { TASK_CATEGORIES } from "@/lib/types";

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

export function countTasksByCategory(tasks: readonly Task[]): CategoryCount[] {
  return TASK_CATEGORIES.map((category) => {
    const inCategory = tasks.filter((task) => task.category === category);
    return {
      category,
      total: inCategory.length,
      completed: inCategory.filter((task) => task.status === "completed").length,
    };
  });
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
