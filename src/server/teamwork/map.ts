import type { Task, TaskStatus } from "@/lib/types";
import type { TeamworkIncluded, TeamworkTask } from "./types";

export interface MappedWork {
  tasks: Task[];
  /** Teamwork user id → display name, for resolving the "Assigned to" column. */
  people: Record<string, string>;
}

/** Teamwork status + progress → our three-state status. */
export function toTaskStatus(status: string, progress: number): TaskStatus {
  if (status === "completed") return "completed";
  if (status === "reopened" || progress > 0) return "in-progress";
  return "todo";
}

/** The month a task belongs to: when it was completed, else when it is due. */
function taskMonth(task: TeamworkTask): string {
  const basis = task.completedOn || task.dueDate || task.startDate || task.createdAt || "";
  return basis.slice(0, 7);
}

function personName(user: { firstName?: string; lastName?: string } | undefined): string {
  if (!user) return "Unassigned";
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unassigned";
}

/**
 * Maps raw Teamwork tasks to the dashboard's Task shape. Pure: all lookups come
 * from `included`. The category is the Teamwork task list, because Teamwork has
 * no field matching the sample data's categories — see docs/INTEGRATIONS.md.
 */
export function mapTeamworkTasks(
  rawTasks: readonly TeamworkTask[],
  included: TeamworkIncluded | undefined,
  projectName: string,
): MappedWork {
  const users = included?.users ?? {};
  const tasklists = included?.tasklists ?? {};
  const people: Record<string, string> = {};

  const tasks = rawTasks.map((raw): Task => {
    const assigneeId = raw.assigneeUserIds?.[0];
    if (assigneeId !== undefined) {
      people[String(assigneeId)] = personName(users[String(assigneeId)]);
    }
    const list = raw.tasklistId !== null ? tasklists[String(raw.tasklistId)] : undefined;
    return {
      id: `tw-${raw.id}`,
      name: raw.name,
      category: list?.name ?? "Unsorted",
      project: projectName,
      assigneeId: assigneeId !== undefined ? String(assigneeId) : "",
      status: toTaskStatus(raw.status, raw.progress),
      month: taskMonth(raw),
      dueDate: raw.dueDate ?? "",
      completedDate: raw.completedOn ? raw.completedOn.slice(0, 10) : null,
      completedAt: raw.completedAt ?? null,
    };
  });

  return { tasks, people };
}

/** The numeric id of the tag with this name, from the sideloaded tag map. */
export function findTagId(included: TeamworkIncluded | undefined, tagName: string): number | null {
  for (const tag of Object.values(included?.tags ?? {})) {
    if (tag.name === tagName) return tag.id;
  }
  return null;
}

/** Keeps only tasks carrying the given tag id. */
export function filterByTag(tasks: readonly TeamworkTask[], tagId: number): TeamworkTask[] {
  return tasks.filter((task) => (task.tagIds ?? []).includes(tagId));
}
