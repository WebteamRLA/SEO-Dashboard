import "server-only";
import { getTeamworkConfig, type TeamworkConfig } from "./config";
import type { TeamworkTasksResponse } from "./types";

export class TeamworkRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeamworkRequestError";
  }
}

const TIMEOUT_MS = 20_000;

async function get<T>(config: TeamworkConfig, path: string): Promise<T> {
  // Basic auth: the API key is the username, any password. Built per request.
  const auth = Buffer.from(`${config.apiKey}:x`).toString("base64");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      // Status only: the body can echo request detail, never the key.
      throw new TeamworkRequestError(`Teamwork returned ${response.status} for ${path.split("?")[0]}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof TeamworkRequestError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new TeamworkRequestError("Teamwork did not respond in time.");
    }
    throw new TeamworkRequestError("Could not reach Teamwork.");
  } finally {
    clearTimeout(timer);
  }
}

interface CacheEntry {
  at: number;
  value: { response: TeamworkTasksResponse; projectName: string };
}
const TASKS_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

/**
 * All tasks in the SEO project, with tags, task lists, and assignees sideloaded.
 * Cached briefly so navigating between pages does not re-hit Teamwork's rate
 * limit. The cache is per server instance, which is all a read needs.
 */
export async function fetchSeoProjectTasks(): Promise<{
  response: TeamworkTasksResponse;
  projectName: string;
}> {
  const config = getTeamworkConfig();
  const key = config.projectId;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TASKS_TTL_MS) return hit.value;

  const [tasks, project] = await Promise.all([
    get<TeamworkTasksResponse>(
      config,
      `/projects/api/v3/projects/${config.projectId}/tasks.json` +
        "?includeCompletedTasks=true&include=tags,tasklists,users&pageSize=500",
    ),
    get<{ project?: { name?: string } }>(config, `/projects/api/v3/projects/${config.projectId}.json`),
  ]);

  const value = { response: tasks, projectName: project.project?.name ?? "SEO Project" };
  cache.set(key, { at: Date.now(), value });
  return value;
}
