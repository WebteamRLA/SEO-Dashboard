import type {
  ISODateTime,
  Lead,
  LeadActivity,
  LeadMetrics,
  LeadPatch,
  LeadSourceCount,
  MonthKey,
  MonthlyRevenue,
  PipelineStage,
  RevenueBySource,
  RevenueSummary,
  StatusTone,
} from "@/lib/types";
import { LEAD_SOURCES } from "@/lib/types";
import { toMonthKey } from "@/lib/month";

export const STAGE_META: Record<PipelineStage, { label: string; tone: StatusTone }> = {
  new: { label: "New", tone: "info" },
  contacted: { label: "Contacted", tone: "neutral" },
  meeting: { label: "Meeting", tone: "warning" },
  proposal: { label: "Proposal", tone: "serious" },
  won: { label: "Won", tone: "good" },
  lost: { label: "Lost", tone: "critical" },
  spam: { label: "Spam", tone: "neutral" },
};

export const SPAM_TAG_LABEL = {
  ai: "Filtered by AI",
  courtney: "Filtered by Courtney",
} as const;

export function leadsInMonth(leads: readonly Lead[], month: MonthKey): Lead[] {
  return leads.filter((lead) => lead.submittedAt !== null && toMonthKey(lead.submittedAt) === month);
}

/** Won deals with a recorded value. A won lead with no value counts as $0. */
function wonLeads(leads: readonly Lead[]): Lead[] {
  return leads.filter((lead) => lead.stage === "won");
}

export function computeLeadMetrics(leads: readonly Lead[]): LeadMetrics {
  const spam = leads.filter((lead) => lead.stage === "spam").length;
  const won = wonLeads(leads);
  return {
    total: leads.length,
    spam,
    genuine: leads.length - spam,
    organic: leads.filter(
      (lead) => lead.attribution.source === "Organic Search" && lead.stage !== "spam",
    ).length,
    won: won.length,
    wonRevenue: won.reduce((sum, lead) => sum + (lead.dealValue ?? 0), 0),
  };
}

/** Ranked by count, largest first. Spam is excluded and zero rows are dropped. */
export function countLeadsBySource(leads: readonly Lead[]): LeadSourceCount[] {
  const genuine = leads.filter((lead) => lead.stage !== "spam");
  return LEAD_SOURCES.map((source) => ({
    source,
    count: genuine.filter((lead) => lead.attribution.source === source).length,
  }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function computeRevenueSummary(leads: readonly Lead[]): RevenueSummary {
  const won = wonLeads(leads);
  const totalWon = won.reduce((sum, lead) => sum + (lead.dealValue ?? 0), 0);
  return {
    totalWon,
    wonDeals: won.length,
    averageDeal: won.length === 0 ? 0 : Math.round(totalWon / won.length),
  };
}

export function computeMonthlyRevenue(
  leads: readonly Lead[],
  months: readonly MonthKey[],
): MonthlyRevenue[] {
  return months.map((month) => {
    const summary = computeRevenueSummary(leadsInMonth(leads, month));
    return { month, revenue: summary.totalWon, deals: summary.wonDeals };
  });
}

export function computeRevenueBySource(leads: readonly Lead[]): RevenueBySource[] {
  return LEAD_SOURCES.map((source) => {
    const summary = computeRevenueSummary(
      leads.filter((lead) => lead.attribution.source === source),
    );
    return { source, revenue: summary.totalWon, deals: summary.wonDeals };
  })
    .filter((row) => row.deals > 0)
    .sort((a, b) => b.revenue - a.revenue);
}

export interface LeadChangeContext {
  actorId: string;
  actorName: string;
  now: ISODateTime;
  /** Unique suffix for generated activity ids. */
  eventId: string;
}

function appendActivity(
  lead: Lead,
  entry: Pick<LeadActivity, "type" | "description">,
  context: LeadChangeContext,
): LeadActivity[] {
  return [
    {
      id: `activity-${lead.id}-${context.eventId}`,
      actorId: context.actorId,
      actorName: context.actorName,
      createdAt: context.now,
      ...entry,
    },
    ...lead.activity,
  ];
}

/**
 * Applies a manual stage change. Won requires a positive deal value, spam
 * applies the "Filtered by Courtney" tag, and leaving spam clears any tag so a
 * rescued lead stops reading as filtered.
 */
export function applyStageChange(
  lead: Lead,
  stage: PipelineStage,
  context: LeadChangeContext,
  dealValue?: number,
): Lead {
  if (lead.stage === stage) return lead;
  if (stage === "won" && !(typeof dealValue === "number" && dealValue > 0)) {
    throw new Error("A deal value greater than zero is required to mark a lead as Won.");
  }

  const from = STAGE_META[lead.stage].label;
  const to = STAGE_META[stage].label;
  const entry: Pick<LeadActivity, "type" | "description"> =
    stage === "won"
      ? { type: "deal-won", description: `Deal marked Won (moved from ${from})` }
      : stage === "lost"
        ? { type: "deal-lost", description: `Deal marked Lost (moved from ${from})` }
        : { type: "stage-changed", description: `Stage changed from ${from} to ${to}` };

  return {
    ...lead,
    stage,
    dealValue: stage === "won" ? (dealValue ?? null) : lead.dealValue,
    spamFilteredBy: stage === "spam" ? "courtney" : null,
    activity: appendActivity(lead, entry, context),
  };
}

export function applyNote(lead: Lead, body: string, context: LeadChangeContext): Lead {
  const trimmed = body.trim();
  if (!trimmed) return lead;
  return {
    ...lead,
    notes: [
      {
        id: `note-${lead.id}-${context.eventId}`,
        authorId: context.actorId,
        authorName: context.actorName,
        body: trimmed,
        createdAt: context.now,
      },
      ...lead.notes,
    ],
    activity: appendActivity(
      lead,
      { type: "note-added", description: "Note added" },
      context,
    ),
  };
}

/** Whether a patch would change anything. Unchanged edits are not events. */
export function leadPatchChanges(lead: Lead, patch: LeadPatch): boolean {
  return (Object.keys(patch) as (keyof LeadPatch)[]).some((key) => patch[key] !== lead[key]);
}

export function applyLeadPatch(
  lead: Lead,
  patch: LeadPatch,
  context: LeadChangeContext,
): Lead {
  if (!leadPatchChanges(lead, patch)) return lead;
  return {
    ...lead,
    ...patch,
    activity: appendActivity(
      lead,
      { type: "details-updated", description: "Lead details updated" },
      context,
    ),
  };
}
