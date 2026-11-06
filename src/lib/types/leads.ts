import type { ISODateTime } from "./common";

export const PIPELINE_STAGES = [
  "new",
  "contacted",
  "meeting",
  "proposal",
  "won",
  "lost",
  "spam",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const LEAD_SOURCES = [
  "Organic Search",
  "Direct",
  "Referral",
  "Paid Search",
  "Social",
  "Email",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

/** Who classified a lead as spam. Rendered as a "Filtered by ..." tag. */
export type SpamFilteredBy = "ai" | "courtney";

export interface LeadNote {
  id: string;
  authorId: string;
  body: string;
  createdAt: ISODateTime;
}

export type LeadActivityType =
  | "created"
  | "stage-changed"
  | "note-added"
  | "deal-won"
  | "deal-lost"
  | "details-updated";

export interface LeadActivity {
  id: string;
  type: LeadActivityType;
  description: string;
  actorId: string | null; // null means the system.
  createdAt: ISODateTime;
}

export interface LeadAttribution {
  source: LeadSource;
  medium: string;
  campaign: string | null;
  landingPage: string;
  referrer: string | null;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
  formName: string;
  pageUrl: string;
  submittedAt: ISODateTime;
  attribution: LeadAttribution;
  stage: PipelineStage;
  dealValue: number | null;
  assigneeId: string | null;
  spamFilteredBy: SpamFilteredBy | null;
  notes: LeadNote[];
  activity: LeadActivity[];
}

/** Fields a user may edit directly on a lead. */
export type LeadPatch = Partial<
  Pick<Lead, "name" | "email" | "phone" | "company" | "dealValue" | "assigneeId">
>;

export interface LeadMetrics {
  total: number;
  organic: number;
  /** Excludes spam. */
  genuine: number;
  spam: number;
  won: number;
  wonRevenue: number;
}

export interface LeadSourceCount {
  source: LeadSource;
  count: number;
}

export interface RevenueSummary {
  totalWon: number;
  wonDeals: number;
  averageDeal: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  deals: number;
}

export interface RevenueBySource {
  source: LeadSource;
  revenue: number;
  deals: number;
}
