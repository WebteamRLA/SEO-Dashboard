import type { ReactNode } from "react";
import { LeadsProvider } from "@/features/leads/leads-store";
import { getPipeline, type PipelineData } from "@/lib/data/leads";

/**
 * The pages that read leads (Overview, Leads, Revenue) share one read-only
 * leads store, loaded from the Teamwork Pipeline board. Only these pages load
 * it; the route group adds nothing to the URLs.
 */
export default async function LeadPagesLayout({ children }: { children: ReactNode }) {
  let pipeline: PipelineData = { leads: [], columns: [], syncedAt: null };
  let error: string | null = null;
  try {
    pipeline = await getPipeline();
  } catch (cause) {
    // A Teamwork outage or missing settings must not take these pages down.
    error = cause instanceof Error ? cause.message : "Could not load leads from Teamwork.";
  }

  return (
    <LeadsProvider initialLeads={pipeline.leads} columns={pipeline.columns} syncedAt={pipeline.syncedAt} error={error}>
      {children}
    </LeadsProvider>
  );
}
