import "server-only";
import { cache } from "react";
import { addDays } from "@/lib/date-range";
import type { ISODate, ISODateTime, Lead, PipelineColumn } from "@/lib/types";
import { requireSessionUser } from "@/server/auth/session";
import { fetchPipeline, pipelineLoadedAt } from "@/server/teamwork/client";
import { toPipelineLeads } from "@/server/teamwork/pipeline-map";

/**
 * Leads come from Courtney's Teamwork "Pipeline - Business Development"
 * board, read-only: one lead per open card, staged by its board column.
 */
export interface PipelineData {
  leads: Lead[];
  /** The board's columns, Backlog first, in board order. */
  columns: PipelineColumn[];
  /** When this copy was loaded from Teamwork. */
  syncedAt: ISODateTime | null;
}

/** The Pipeline board as leads. Shared by everything that renders in one request. */
export const getPipeline = cache(async (): Promise<PipelineData> => {
  await requireSessionUser();
  const snapshot = await fetchPipeline();
  const loadedAt = pipelineLoadedAt();
  return {
    leads: toPipelineLeads(snapshot.tasks, snapshot.columns, snapshot.included, snapshot.baseUrl),
    columns: snapshot.columns,
    syncedAt: loadedAt === null ? null : new Date(loadedAt).toISOString(),
  };
});

/** All leads, newest first. Requires a signed-in user. */
export async function getLeads(): Promise<Lead[]> {
  return (await getPipeline()).leads;
}

export async function getLead(id: string): Promise<Lead | null> {
  return (await getPipeline()).leads.find((lead) => lead.id === id) ?? null;
}

/** Leads added in the last `days` days: what the notification bell needs. */
export async function getRecentLeads(today: ISODate, days: number): Promise<Lead[]> {
  const since = `${addDays(today, -days)}T00:00:00.000Z`;
  return (await getLeads()).filter((lead) => lead.submittedAt !== null && lead.submittedAt >= since);
}
