import "server-only";
import { requireSessionUser } from "@/server/auth/session";
import { resolveRoadmap } from "@/lib/domain/progress";
import { fetchSeoProjectTasks } from "@/server/teamwork/client";
import { filterByTag, findTagId, mapTeamworkTasks } from "@/server/teamwork/map";
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
 * Live Work Tracker data: the SEO-tagged tasks in the Teamwork project, mapped
 * to the dashboard's shape. The caller filters to the selected month. Overview
 * and Roadmap still use the sample data above until they are wired up too.
 */
export async function getWorkTrackerData(): Promise<WorkTrackerData> {
  await requireSessionUser();
  const { seoTagName } = getTeamworkConfig();
  const { response, projectName } = await fetchSeoProjectTasks();
  const seoTagId = findTagId(response.included, seoTagName);
  const seoTasks = seoTagId === null ? [] : filterByTag(response.tasks, seoTagId);
  return mapTeamworkTasks(seoTasks, response.included, projectName);
}

/** Roadmap items with status and progress derived from their linked tasks. */
export async function getRoadmap(): Promise<RoadmapItemWithProgress[]> {
  await requireSessionUser();
  return resolveRoadmap(roadmapItems, tasks);
}
