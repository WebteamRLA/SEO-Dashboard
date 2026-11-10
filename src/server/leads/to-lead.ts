import type { Lead, LeadActivity, LeadActivityType, LeadOrigin, LeadSource, PipelineStage, SpamFilteredBy } from "@/lib/types";
import { LEAD_SOURCES, PIPELINE_STAGES } from "@/lib/types";

/** A Prisma Decimal, or anything else that prints as a decimal number. */
interface DecimalLike {
  toString(): string;
}

/** The columns `toLead` reads: a `lead` row with its payments. */
export interface LeadRow {
  id: string;
  origin: string;
  submittedAt: Date | null;
  name: string | null;
  email: string | null;
  company: string | null;
  heardFrom: string | null;
  channel: string;
  budget: string | null;
  services: string | null;
  message: string | null;
  stage: string;
  pipelineNote: string | null;
  wonOn: Date | null;
  /** Website-form columns. Optional so sheet-only callers need not set them. */
  phone?: string | null;
  formName?: string | null;
  pageUrl?: string | null;
  landingPage?: string | null;
  referrer?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  payments: { sequence: number; amount: DecimalLike; commission: DecimalLike | null }[];
  /** Dashboard edits. Optional so import-only callers need not set them. */
  dealValue?: DecimalLike | null;
  spamFilteredBy?: string | null;
  assigneeId?: string | null;
  notes?: { id: string; authorId: string | null; authorName: string; body: string; createdAt: Date }[];
  events?: { id: string; type: string; description: string; actorId: string | null; actorName: string | null; createdAt: Date }[];
}

const ACTIVITY_TYPES: readonly LeadActivityType[] = [
  "created",
  "stage-changed",
  "note-added",
  "deal-won",
  "deal-lost",
  "details-updated",
];
const SPAM_FILTERS: readonly SpamFilteredBy[] = ["ai", "courtney"];

const newestFirst = (a: { createdAt: Date }, b: { createdAt: Date }) => b.createdAt.getTime() - a.createdAt.getTime();

/** What to load with a lead row so `toLead` has everything it maps. */
export const LEAD_INCLUDE = {
  payments: { orderBy: { sequence: "asc" } },
  notes: { orderBy: { createdAt: "desc" } },
  events: { orderBy: { createdAt: "desc" } },
} as const;

const ORIGINS: readonly LeadOrigin[] = ["sheet", "website-form", "manual"];

function oneOf<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Joins the form's answers into one readable message. */
function buildMessage(row: LeadRow): string | null {
  const parts = [
    row.message,
    row.services ? `Services: ${row.services}` : null,
    row.budget ? `Budget: ${row.budget}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join("\n\n") : null;
}

/** Maps a stored lead to what the dashboard shows. Pure, so it is unit-tested. */
export function toLead(row: LeadRow): Lead {
  const payments = row.payments
    .map((payment) => ({
      sequence: payment.sequence,
      amount: Number(payment.amount.toString()),
      commission: payment.commission === null ? null : Number(payment.commission.toString()),
    }))
    .sort((a, b) => a.sequence - b.sequence);
  const received = payments.reduce((sum, payment) => sum + payment.amount, 0);
  // A value typed in the dashboard wins over the sheet's revenue cells.
  const typed = row.dealValue == null ? null : Number(row.dealValue.toString());
  const activity: LeadActivity[] = [...(row.events ?? [])].sort(newestFirst).map((event) => ({
    id: event.id,
    type: oneOf(event.type, ACTIVITY_TYPES, "details-updated"),
    description: event.description,
    actorId: event.actorId,
    actorName: event.actorName,
    createdAt: event.createdAt.toISOString(),
  }));

  return {
    id: row.id,
    origin: oneOf(row.origin, ORIGINS, "manual"),
    name: row.name ?? row.company ?? row.email ?? "Unnamed lead",
    email: row.email,
    phone: row.phone ?? null,
    company: row.company,
    message: buildMessage(row),
    formName: row.formName ?? null,
    pageUrl: row.pageUrl ?? null,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    attribution: {
      source: oneOf<LeadSource>(row.channel, LEAD_SOURCES, "Unknown"),
      heardFrom: row.heardFrom,
      medium: row.utmMedium ?? null,
      campaign: row.utmCampaign ?? null,
      landingPage: row.landingPage ?? null,
      referrer: row.referrer ?? null,
    },
    stage: oneOf<PipelineStage>(row.stage, PIPELINE_STAGES, "new"),
    dealValue: typed ?? (received > 0 ? Math.round(received * 100) / 100 : null),
    pipelineNote: row.pipelineNote,
    wonOn: row.wonOn?.toISOString().slice(0, 10) ?? null,
    payments,
    assigneeId: row.assigneeId ?? null,
    spamFilteredBy: row.spamFilteredBy ? oneOf<SpamFilteredBy>(row.spamFilteredBy, SPAM_FILTERS, "courtney") : null,
    notes: [...(row.notes ?? [])].sort(newestFirst).map((note) => ({
      id: note.id,
      authorId: note.authorId,
      authorName: note.authorName,
      body: note.body,
      createdAt: note.createdAt.toISOString(),
    })),
    activity,
  };
}
