"use client";

import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { applyLeadPatch, applyNote, applyStageChange } from "@/lib/domain/leads";
import type { Lead, LeadPatch, PipelineStage, TeamMember } from "@/lib/types";

interface LeadsStore {
  leads: Lead[];
  team: TeamMember[];
  currentUser: TeamMember;
  getLead: (id: string) => Lead | undefined;
  /** Moving to `won` requires `dealValue`. Open the deal value dialog first. */
  moveLead: (id: string, stage: PipelineStage, dealValue?: number) => void;
  addNote: (id: string, body: string) => void;
  updateLead: (id: string, patch: LeadPatch) => void;
}

const LeadsContext = createContext<LeadsStore | null>(null);

/**
 * Holds leads for the whole dashboard, so a pipeline move also shows in the
 * inbox, lead details, and Overview. Changes last until the page is reloaded.
 *
 * The rules live in `lib/domain/leads`. The next step replaces the state calls
 * here with Server Actions; consumers of `useLeads()` do not change.
 */
export function LeadsProvider({
  initialLeads,
  team,
  currentUser,
  children,
}: {
  initialLeads: Lead[];
  team: TeamMember[];
  currentUser: TeamMember;
  children: ReactNode;
}) {
  const [leads, setLeads] = useState(initialLeads);
  const eventCounter = useRef(0);

  const update = useCallback(
    (
      id: string,
      change: (lead: Lead, context: Parameters<typeof applyNote>[2]) => Lead,
    ) => {
      eventCounter.current += 1;
      const context = {
        actorId: currentUser.id,
        now: new Date().toISOString(),
        eventId: `local-${eventCounter.current}`,
      };
      setLeads((current) =>
        current.map((lead) => (lead.id === id ? change(lead, context) : lead)),
      );
    },
    [currentUser.id],
  );

  const store = useMemo<LeadsStore>(
    () => ({
      leads,
      team,
      currentUser,
      getLead: (id) => leads.find((lead) => lead.id === id),
      moveLead: (id, stage, dealValue) =>
        update(id, (lead, context) => applyStageChange(lead, stage, context, dealValue)),
      addNote: (id, body) => update(id, (lead, context) => applyNote(lead, body, context)),
      updateLead: (id, patch) =>
        update(id, (lead, context) => applyLeadPatch(lead, patch, context)),
    }),
    [leads, team, currentUser, update],
  );

  return <LeadsContext value={store}>{children}</LeadsContext>;
}

export function useLeads(): LeadsStore {
  const store = use(LeadsContext);
  if (!store) throw new Error("useLeads must be used inside LeadsProvider.");
  return store;
}
