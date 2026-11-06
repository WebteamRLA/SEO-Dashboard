import { TASK_CATEGORIES, type MonthKey, type Progress, type RoadmapItemWithProgress, type TaskCategory } from "@/lib/types";

export type StatusFilter = "all" | "completed" | "pending";

export function filterByStatus(
  items: readonly RoadmapItemWithProgress[],
  filter: StatusFilter,
): RoadmapItemWithProgress[] {
  return filter === "all" ? [...items] : items.filter((item) => item.status === filter);
}

/** Groups in the fixed category order. Empty categories are omitted. */
export function groupByCategory(
  items: readonly RoadmapItemWithProgress[],
): { category: TaskCategory; items: RoadmapItemWithProgress[] }[] {
  return TASK_CATEGORIES.map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);
}

/** One group per month, in the order given, including months with no items. */
export function groupByMonth(
  items: readonly RoadmapItemWithProgress[],
  months: readonly MonthKey[],
): { month: MonthKey; items: RoadmapItemWithProgress[] }[] {
  return months.map((month) => ({ month, items: items.filter((item) => item.month === month) }));
}

/** "2 of 3 tasks", or "Not started" when nothing is linked yet. */
export function describeItemProgress(progress: Progress): string {
  if (progress.total === 0) return "Not started";
  return `${progress.completed} of ${progress.total} ${progress.total === 1 ? "task" : "tasks"}`;
}
