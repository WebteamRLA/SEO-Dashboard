import "server-only";
import { resolveRoadmap } from "@/lib/domain/progress";
import type { MonthKey, RoadmapItemWithProgress, Task } from "@/lib/types";
import { roadmapItems, tasks } from "@/mocks/work";

export async function getTasks(): Promise<Task[]> {
  return tasks;
}

export async function getTasksForMonth(month: MonthKey): Promise<Task[]> {
  return tasks.filter((task) => task.month === month);
}

/** Roadmap items with status and progress derived from their linked tasks. */
export async function getRoadmap(): Promise<RoadmapItemWithProgress[]> {
  return resolveRoadmap(roadmapItems, tasks);
}
