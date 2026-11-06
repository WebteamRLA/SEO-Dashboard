import type { ISODate, MonthKey, Progress } from "./common";

export const TASK_STATUSES = ["todo", "in-progress", "completed"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_CATEGORIES = [
  "Blog Writing",
  "Landing Pages",
  "Technical SEO",
  "Keyword Research",
  "On-Page",
  "Content Updates",
] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

/** One unit of SEO work. Sourced from Teamwork in a later step. */
export interface Task {
  id: string;
  name: string;
  category: TaskCategory;
  project: string;
  assigneeId: string;
  status: TaskStatus;
  month: MonthKey;
  dueDate: ISODate;
  completedDate: ISODate | null;
}

export interface TaskCounts {
  total: number;
  todo: number;
  inProgress: number;
  completed: number;
}

export interface CategoryCount {
  category: TaskCategory;
  total: number;
  completed: number;
}

/** A strategy roadmap item. Its progress is derived from its linked tasks. */
export interface RoadmapItem {
  id: string;
  title: string;
  category: TaskCategory;
  month: MonthKey;
  taskIds: string[];
}

export interface RoadmapItemWithProgress extends RoadmapItem {
  status: "completed" | "pending";
  progress: Progress;
}
