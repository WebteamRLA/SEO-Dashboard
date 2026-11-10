import type { ISODate, ISODateTime } from "./common";

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

/** The channel a lead came through, as RLA classifies it. */
export const LEAD_SOURCES = [
  "Organic Search",
  "AI Search",
  "Referral",
  "Paid Search",
  "Social",
  "Direct",
  "Email",
  "Unknown",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

/** Who classified a lead as spam. Rendered as a "Filtered by ..." tag. */
export type SpamFilteredBy = "ai" | "courtney";

export interface LeadNote {
  id: string;
  /** Null once the author's account is gone; `authorName` keeps who wrote it. */
  authorId: string | null;
  authorName: string;
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
  actorId: string | null;
  /** Who did it, as named at the time. Null means the system. */
  actorName: string | null;
  createdAt: ISODateTime;
}

/** Where a lead record came from. */
export type LeadOrigin = "sheet" | "website-form" | "manual";

export interface LeadAttribution {
  source: LeadSource;
  /** How the person says they found RLA, in their words ("ChatGPT", "LinkedIn"). */
  heardFrom: string | null;
  /** Tracking details. Only website-form leads carry these. */
  medium: string | null;
  campaign: string | null;
  landingPage: string | null;
  referrer: string | null;
}

/** Money received for a won lead, in USD. */
export interface LeadPayment {
  /** 1 to 4: the sheet's "Revenue Month N". */
  sequence: number;
  amount: number;
  commission: number | null;
}

export interface Lead {
  id: string;
  origin: LeadOrigin;
  /** Display name, never empty: the person, else the company, else the email. */
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  message: string | null;
  formName: string | null;
  pageUrl: string | null;
  /** Null when the source has no date for the lead. */
  submittedAt: ISODateTime | null;
  attribution: LeadAttribution;
  stage: PipelineStage;
  /** Revenue received so far: the sum of `payments`, or a value set in the dashboard. */
  dealValue: number | null;
  /** The pipeline's "Notes/Lost Reason", as Courtney wrote it. */
  pipelineNote: string | null;
  /** The close date. Revenue is reported by this date. */
  wonOn: ISODate | null;
  payments: LeadPayment[];
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
