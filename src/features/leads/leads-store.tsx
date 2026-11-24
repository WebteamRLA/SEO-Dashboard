"use client";

import { createContext, use, useMemo, type ReactNode } from "react";
import type { ISODateTime, Lead, PipelineColumn } from "@/lib/types";

interface LeadsStore {
  leads: Lead[];
  /** The Teamwork board's columns, in board order. */
  columns: PipelineColumn[];
  /** When the leads were last pulled from Teamwork. */
  syncedAt: ISODateTime | null;
  /** Why no leads could be loaded, when Teamwork was unreachable. */
  error: string | null;
  getLead: (id: string) => Lead | undefined;
}

const LeadsContext = createContext<LeadsStore | null>(null);

/**
 * Leads for the pages that show them (Overview, Leads, Revenue), loaded once
 * per visit from the Teamwork Pipeline board. Read-only: leads change in
 * Teamwork, and the Sync button pulls the latest copy.
 */
export function LeadsProvider({
  initialLeads,
  columns = [],
  syncedAt = null,
  error = null,
  children,
}: {
  initialLeads: Lead[];
  columns?: PipelineColumn[];
  syncedAt?: ISODateTime | null;
  error?: string | null;
  children: ReactNode;
}) {
  const store = useMemo<LeadsStore>(
    () => ({
      leads: initialLeads,
      columns,
      syncedAt,
      error,
      getLead: (id) => initialLeads.find((lead) => lead.id === id),
    }),
    [initialLeads, columns, syncedAt, error],
  );

  return <LeadsContext value={store}>{children}</LeadsContext>;
}

export function useLeads(): LeadsStore {
  const store = use(LeadsContext);
  if (!store) throw new Error("useLeads must be used inside LeadsProvider.");
  return store;
}
