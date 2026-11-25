import type { ISODate, ISODateTime, Phase } from "./common";

/* Reports ------------------------------------------------------------------ */

export type ReportStatus = "draft" | "ready" | "sent";

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
  /** False when this event has no email to send; the email switch is then off and disabled. */
  emailAvailable?: boolean;
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
