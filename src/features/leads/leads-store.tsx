"use client";

import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { applyLeadPatch, applyNote, applyStageChange, type LeadChangeContext } from "@/lib/domain/leads";
import type { Lead, LeadPatch, PipelineStage, TeamMember } from "@/lib/types";
import { addLeadNote, moveLeadStage, updateLeadDetails, type LeadEditResult } from "@/server/leads/actions";

/** A dashboard user, as lead screens need them: to assign leads and sign edits. */
export type LeadPerson = Pick<TeamMember, "id" | "name">;

interface LeadsStore {
  leads: Lead[];
  team: LeadPerson[];
  currentUser: LeadPerson;
  getLead: (id: string) => Lead | undefined;
  /** Moving to `won` requires `dealValue`. Open the deal value dialog first. */
  moveLead: (id: string, stage: PipelineStage, dealValue?: number) => void;
  addNote: (id: string, body: string) => void;
  updateLead: (id: string, patch: LeadPatch) => void;
}

const LeadsContext = createContext<LeadsStore | null>(null);

/**
 * Holds leads for the whole dashboard, so a pipeline move also shows in the
 * inbox, lead details, and Overview. Each edit shows at once, using the same
 * rules as the server (`lib/domain/leads`), and is then saved by a Server
 * Action. The saved lead replaces the shown one; if saving fails, the lead goes
 * back to how it was and an error explains why.
 */
export function LeadsProvider({
  initialLeads,
  team,
  currentUser,
  children,
}: {
  initialLeads: Lead[];
  team: LeadPerson[];
  currentUser: LeadPerson;
  children: ReactNode;
}) {
  const [leads, setLeads] = useState(initialLeads);
  const eventCounter = useRef(0);

  const replace = useCallback((lead: Lead) => {
    setLeads((current) => current.map((item) => (item.id === lead.id ? lead : item)));
  }, []);

  const update = useCallback(
    (id: string, change: (lead: Lead, context: LeadChangeContext) => Lead, save: () => Promise<LeadEditResult>) => {
      const before = leads.find((lead) => lead.id === id);
      if (!before) return;
      eventCounter.current += 1;
      const after = change(before, {
        actorId: currentUser.id,
        actorName: currentUser.name,
        now: new Date().toISOString(),
        eventId: `pending-${eventCounter.current}`,
      });
      if (after === before) return;
      replace(after);

      save()
        .then((result) => {
          if (result.ok) {
            replace(result.lead);
          } else {
            replace(before);
            toast.error(result.error);
          }
        })
        .catch(() => {
          replace(before);
          toast.error("The change could not be saved. Check your connection and try again.");
        });
    },
    [leads, currentUser, replace],
  );

  const store = useMemo<LeadsStore>(
    () => ({
      leads,
      team,
      currentUser,
      getLead: (id) => leads.find((lead) => lead.id === id),
      moveLead: (id, stage, dealValue) =>
        update(
          id,
          (lead, context) => applyStageChange(lead, stage, context, dealValue),
          () => moveLeadStage(id, stage, dealValue),
        ),
      addNote: (id, body) =>
        update(id, (lead, context) => applyNote(lead, body, context), () => addLeadNote(id, body)),
      updateLead: (id, patch) =>
        update(id, (lead, context) => applyLeadPatch(lead, patch, context), () => updateLeadDetails(id, patch)),
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
