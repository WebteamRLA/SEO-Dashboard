import { isWithin, type DateRange } from "@/lib/date-range";
import type { Lead, PipelineStage } from "@/lib/types";
import { PIPELINE_STAGES } from "@/lib/types";

export interface InboxFilters {
  search: string;
  /** A lead source, or "all". */
  source: string;
  /** Only leads added in this period (the topbar date range). Null for every lead. */
  range: DateRange | null;
  /** A pipeline stage, or "all". */
  stage: string;
}

/**
 * Leads matching the inbox filters. A lead counts in the period by the day it
 * was added, in the reporting time zone, exactly as the Overview counts it.
 */
export function filterLeads(leads: readonly Lead[], filters: InboxFilters): Lead[] {
  const query = filters.search.trim().toLowerCase();
  return leads.filter((lead) => {
    if (query) {
      const haystack = `${lead.name} ${lead.email ?? ""} ${lead.company ?? ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (filters.source !== "all" && lead.attribution.source !== filters.source) return false;
    if (filters.stage !== "all" && lead.stage !== filters.stage) return false;
    if (filters.range && !isWithin(lead.submittedAt, filters.range)) return false;
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
