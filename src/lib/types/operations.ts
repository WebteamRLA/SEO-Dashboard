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

export type NotificationKind = "lead" | "task-completed" | "task-overdue";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
  createdAt: ISODateTime;
  href: string;
  read: boolean;
}
