import type { Lead, PipelineStage } from "@/lib/types";
import { PIPELINE_STAGES } from "@/lib/types";

export const DATE_PRESETS = [
  { value: "7", label: "Last 7 days", days: 7 },
  { value: "30", label: "Last 30 days", days: 30 },
  { value: "90", label: "Last 90 days", days: 90 },
] as const;

const DAY_MS = 86_400_000;

export interface InboxFilters {
  search: string;
  /** A lead source, or "all". */
  source: string;
  /** "all" or one of DATE_PRESETS values. */
  period: string;
  /** A pipeline stage, or "all". */
  stage: string;
}

/**
 * Filters the inbox. "Last N days" covers the N days ending on, and including,
 * the reference date. `referenceDate` is passed in so the result never depends
 * on the real clock.
 */
export function filterLeads(
  leads: readonly Lead[],
  filters: InboxFilters,
  referenceDate: string,
): Lead[] {
  const query = filters.search.trim().toLowerCase();
  const preset = DATE_PRESETS.find((item) => item.value === filters.period);
  const since = preset ? Date.parse(referenceDate) - (preset.days - 1) * DAY_MS : null;

  return leads.filter((lead) => {
    if (query) {
      const haystack = `${lead.name} ${lead.email ?? ""} ${lead.company ?? ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (filters.source !== "all" && lead.attribution.source !== filters.source) return false;
    if (filters.stage !== "all" && lead.stage !== filters.stage) return false;
    if (since !== null && (lead.submittedAt === null || Date.parse(lead.submittedAt) < since)) return false;
    return true;
  });
}

export interface StageColumn {
  stage: PipelineStage;
  leads: Lead[];
  totalValue: number;
}

/** One column per stage, in pipeline order. Leads keep their input order. */
/** Board column order: Spam sits first so triage happens before the real pipeline. */
export const BOARD_STAGES: readonly PipelineStage[] = [
  "spam",
  ...PIPELINE_STAGES.filter((stage) => stage !== "spam"),
];

export function groupByStage(leads: readonly Lead[]): StageColumn[] {
  return BOARD_STAGES.map((stage) => {
    const inStage = leads.filter((lead) => lead.stage === stage);
    return {
      stage,
      leads: inStage,
      totalValue: inStage.reduce((sum, lead) => sum + (lead.dealValue ?? 0), 0),
    };
  });
}

/** Parses "$12,500" or "12500.50". Returns null unless the result is a positive number. */
export function parseDealValue(input: string): number | null {
  const cleaned = input.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export interface ContactInput {
  name: string;
  email: string;
  phone: string;
  company: string;
}

export type ContactErrors = Partial<Record<keyof ContactInput, string>>;

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Name is required. Email is optional, since older leads have none, but must be valid if given. */
export function validateContact(input: ContactInput): ContactErrors {
  const errors: ContactErrors = {};
  if (!input.name.trim()) errors.name = "Enter a name.";
  if (input.email.trim() && !EMAIL_SHAPE.test(input.email.trim())) {
    errors.email = "Enter an email like name@example.com.";
  }
  return errors;
}

/** Form values to a lead patch: blank optional fields become null. */
export function contactToPatch(input: ContactInput): Pick<Lead, "name" | "email" | "phone" | "company"> {
  const optional = (value: string) => value.trim() || null;
  return {
    name: input.name.trim(),
    email: optional(input.email),
    phone: optional(input.phone),
    company: optional(input.company),
  };
}
