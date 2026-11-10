import type { MonthKey, Task } from "@/lib/types";

export type StatusFilter = "all" | "completed" | "pending";

/** Pending means not completed yet: to do or in progress. */
export function filterByStatus(tasks: readonly Task[], filter: StatusFilter): Task[] {
  if (filter === "all") return [...tasks];
  return tasks.filter((task) => (task.status === "completed") === (filter === "completed"));
}

/**
 * Groups by category, derived from the tasks rather than a fixed list, since
 * Teamwork tasks are categorised by task list. Alphabetical; empty groups omitted.
 */
export function groupByCategory(tasks: readonly Task[]): { category: string; tasks: Task[] }[] {
  const categories = [...new Set(tasks.map((task) => task.category))].sort((a, b) => a.localeCompare(b));
  return categories.map((category) => ({ category, tasks: tasks.filter((task) => task.category === category) }));
}

/** One group per month, in the order given, including months with no tasks. */
export function groupByMonth(
  tasks: readonly Task[],
  months: readonly MonthKey[],
): { month: MonthKey; tasks: Task[] }[] {
  return months.map((month) => ({ month, tasks: tasks.filter((task) => task.month === month) }));
}

/** January to December of the given year. */
export function monthsOfYear(year: string): MonthKey[] {
  return Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}` as MonthKey);
}
