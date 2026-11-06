import type { FormMonitorStatus, IssueSeverity, LinkIssueStatus, StatusTone } from "@/lib/types";

/** Shared by the Form Health, Broken Links and Issue Log pages. */

export const FORM_MONITOR_META: Record<FormMonitorStatus, { label: string; tone: StatusTone }> = {
  healthy: { label: "Healthy", tone: "good" },
  degraded: { label: "Degraded", tone: "warning" },
  failing: { label: "Failing", tone: "critical" },
  paused: { label: "Paused", tone: "neutral" },
};

/** Ordered as they appear in the status filter. `rank` sorts most urgent first. */
export const LINK_ISSUE_STATUSES: readonly LinkIssueStatus[] = ["open", "in-progress", "resolved"];

export const LINK_ISSUE_META: Record<LinkIssueStatus, { label: string; tone: StatusTone; rank: number }> = {
  open: { label: "Open", tone: "critical", rank: 0 },
  "in-progress": { label: "In progress", tone: "warning", rank: 1 },
  resolved: { label: "Resolved", tone: "good", rank: 2 },
};

/** Ordered most severe first, which is also the order of the severity filter. */
export const SEVERITIES: readonly IssueSeverity[] = ["critical", "high", "medium", "low"];

export const SEVERITY_META: Record<IssueSeverity, { label: string; tone: StatusTone; rank: number }> = {
  critical: { label: "Critical", tone: "critical", rank: 0 },
  high: { label: "High", tone: "serious", rank: 1 },
  medium: { label: "Medium", tone: "warning", rank: 2 },
  low: { label: "Low", tone: "neutral", rank: 3 },
};
