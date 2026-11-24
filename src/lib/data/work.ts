import "server-only";
import { requireSessionUser } from "@/server/auth/session";
import { resolveRoadmap } from "@/lib/domain/progress";
import { fetchSeoProjectTasks } from "@/server/teamwork/client";
import { mapTeamworkTasks } from "@/server/teamwork/map";
import { getTeamworkConfig } from "@/server/teamwork/config";
import type { MonthKey, RoadmapItemWithProgress, Task } from "@/lib/types";
import { roadmapItems, tasks } from "@/mocks/work";

export async function getTasks(): Promise<Task[]> {
  await requireSessionUser();
  return tasks;
}

export async function getTasksForMonth(month: MonthKey): Promise<Task[]> {
  await requireSessionUser();
  return tasks.filter((task) => task.month === month);
}

export interface WorkTrackerData {
  tasks: Task[];
  /** Teamwork user id → display name, for the "Assigned to" column. */
  people: Record<string, string>;
}

/**
 * Live Work Tracker data: every task in the Teamwork project, across all its
 * task lists (Cards, General tasks) and tags, mapped to the dashboard's shape.
 * The caller filters to the selected period.
 */
export async function getWorkTrackerData(): Promise<WorkTrackerData> {
  await requireSessionUser();
  const { response, projectName } = await fetchSeoProjectTasks();
  return mapTeamworkTasks(response.tasks, response.included, projectName, getTeamworkConfig().baseUrl);
}

/** Roadmap items with status and progress derived from their linked tasks. */
export async function getRoadmap(): Promise<RoadmapItemWithProgress[]> {
  await requireSessionUser();
  return resolveRoadmap(roadmapItems, tasks);
}
