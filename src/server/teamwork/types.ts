/** Minimal shapes for the Teamwork Projects API v3 responses we read. */
export interface TeamworkTask {
  id: number;
  name: string;
  status: string; // "new" | "reopened" | "completed" | ...
  progress: number;
  dueDate: string | null;
  startDate: string | null;
  completedOn: string | null;
  completedAt?: string | null;
  createdAt: string | null;
  tasklistId: number | null;
  tagIds: number[] | null;
  assigneeUserIds: number[] | null;
}

export interface TeamworkIncluded {
  users?: Record<string, { id: number; firstName?: string; lastName?: string }>;
  tasklists?: Record<string, { id: number; name?: string }>;
  tags?: Record<string, { id: number; name?: string }>;
}

export interface TeamworkTasksResponse {
  tasks: TeamworkTask[];
  included?: TeamworkIncluded;
  meta?: { page?: { hasMore?: boolean; pageSize?: number } };
}
