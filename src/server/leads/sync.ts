"use server";

import { requireSessionUser } from "@/server/auth/session";
import { syncPipeline } from "@/server/teamwork/client";

export type PipelineSyncResult =
  | { ok: true; syncedAt: string; cards: number }
  | { ok: false; error: string };

/**
 * Pulls a fresh copy of the Teamwork Pipeline board, skipping the cache. The
 * caller refreshes the page to show it. Read-only: nothing is written back.
 */
export async function syncLeadsFromTeamwork(): Promise<PipelineSyncResult> {
  await requireSessionUser();
  try {
    const snapshot = await syncPipeline();
    return {
      ok: true,
      syncedAt: new Date().toISOString(),
      cards: snapshot.tasks.filter((task) => task.status !== "completed").length,
    };
  } catch (error) {
    // The client's messages are written for people and never hold the API key.
    return { ok: false, error: error instanceof Error ? error.message : "Could not reach Teamwork." };
  }
}
