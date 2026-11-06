import "server-only";
import type { Lead } from "@/lib/types";
import { leads } from "@/mocks/leads";

/** All leads, newest first. */
export async function getLeads(): Promise<Lead[]> {
  return leads;
}

export async function getLead(id: string): Promise<Lead | null> {
  return leads.find((lead) => lead.id === id) ?? null;
}
