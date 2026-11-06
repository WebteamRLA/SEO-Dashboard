import type { ISODate, ISODateTime, MonthKey, Phase } from "./common";

/* Site health -------------------------------------------------------------- */

export type FormMonitorStatus = "healthy" | "degraded" | "failing" | "paused";

export interface MonitoredForm {
  id: string;
  name: string;
  url: string;
  status: FormMonitorStatus;
  lastChecked: ISODateTime;
  failedSubmissions: number;
  monitoring: boolean;
}

export type LinkIssueStatus = "open" | "in-progress" | "resolved";

export interface BrokenLink {
  id: string;
  url: string;
  foundOn: string;
  statusCode: number;
  firstDetected: ISODate;
  lastChecked: ISODate;
  status: LinkIssueStatus;
}

export type IssueSeverity = "critical" | "high" | "medium" | "low";

export interface SiteIssue {
  id: string;
  name: string;
  url: string;
  severity: IssueSeverity;
  detected: ISODate;
  status: LinkIssueStatus;
}

/* Reports ------------------------------------------------------------------ */

export type ReportStatus = "draft" | "ready" | "sent";

/** Lead and revenue figures are not stored here: see `useLeads()` in the table. */
export interface MonthlyReport {
  id: string;
  month: MonthKey;
  organicClicks: number;
  impressions: number;
  averagePosition: number;
  status: ReportStatus;
}

/* AI agents ---------------------------------------------------------------- */

export type AgentSlug =
  | "broken-link"
  | "search-console"
  | "content"
  | "form-test"
  | "lead-filter"
  | "report";

export interface AiAgent {
  slug: AgentSlug;
  name: string;
  purpose: string;
  expectedOutcome: string;
  capabilities: string[];
  phase: Phase;
  status: "planned" | "in-design";
}

/* Delivery roadmap --------------------------------------------------------- */

export type DeliveryStatus = "not-started" | "frontend-preview" | "in-progress" | "complete";

/** A concrete step in a module's delivery. Progress is derived from these. */
export interface DeliveryStep {
  label: string;
  done: boolean;
}

export interface DeliveryModule {
  id: string;
  name: string;
  phase: Phase;
  /** `null` until a date has been confirmed. Never invent one. */
  plannedDate: ISODate | null;
  status: DeliveryStatus;
  steps: DeliveryStep[];
}

/* Settings ----------------------------------------------------------------- */

export type IntegrationId = "teamwork" | "search-console" | "analytics" | "crm";

export interface Integration {
  id: IntegrationId;
  name: string;
  description: string;
  status: "connected" | "not-connected" | "needs-confirmation";
  account: string | null;
  lastSync: ISODateTime | null;
  phase: Phase;
}

export interface FormConnection {
  id: string;
  name: string;
  url: string;
  status: "connected" | "not-connected";
  lastSubmission: ISODateTime | null;
}

export interface NotificationPreference {
  id: string;
  label: string;
  description: string;
  email: boolean;
  inApp: boolean;
  /** Future automation renders disabled until it is actually delivered. */
  available: boolean;
  phase: Phase;
}

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  createdAt: ISODateTime;
  href: string;
  read: boolean;
}
